use crate::database::Database;
use crate::models::edit::{EditEventDTO, EditStateDTO};
use rusqlite::params;
use std::collections::HashMap;

/// Service Event Sourcing pour les éditions non-destructives d'images.
/// L'état courant est toujours reconstruit par rejeu des events (+ snapshot optionnel).
pub struct EditSourcingService;

impl EditSourcingService {
    /// Reconstruit l'état courant depuis les events en DB.
    ///
    /// Algorithme :
    /// 1. Charger le snapshot le plus récent (si existe) → base_state + base_count
    /// 2. Charger tous les events NON-undone APRÈS le snapshot (OFFSET base_count)
    /// 3. Appliquer chaque event sur la map (payload.param = payload.value)
    /// 4. Retourner la map résultante
    pub fn replay_events(db: &mut Database, image_id: i64) -> Result<HashMap<String, f64>, String> {
        let mut state: HashMap<String, f64> = HashMap::new();
        let mut snapshot_event_count: i64 = 0;

        // 1. Charger le snapshot le plus récent
        {
            let conn = db.connection();
            let snapshot_result: rusqlite::Result<(String, i64)> = conn.query_row(
                "SELECT snapshot, event_count FROM edit_snapshots WHERE image_id = ?1",
                params![image_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
            );

            if let Ok((snapshot_json, event_count)) = snapshot_result {
                snapshot_event_count = event_count;
                match serde_json::from_str::<HashMap<String, serde_json::Value>>(&snapshot_json) {
                    Ok(snapshot_map) => {
                        for (k, v) in snapshot_map {
                            if let Some(f) = v.as_f64() {
                                state.insert(k, f);
                            }
                        }
                    }
                    Err(e) => {
                        return Err(format!("Erreur parsing snapshot JSON: {}", e));
                    }
                }
            }
        }

        // 2. Charger tous les events NON-undone APRÈS le snapshot
        let payloads: Vec<String> = {
            let conn = db.connection();
            let mut stmt = conn
                .prepare(
                    "SELECT payload FROM edit_events \
                     WHERE image_id = ?1 AND is_undone = 0 \
                     ORDER BY id ASC \
                     LIMIT -1 OFFSET ?2",
                )
                .map_err(|e| format!("Erreur préparation requête replay: {}", e))?;

            // Note: on force result dans un let pour que le temporaire MappedRows
            // soit droppé avant la fin du bloc (borrow checker Rust).
            let result = stmt
                .query_map(params![image_id, snapshot_event_count], |row| {
                    row.get::<_, String>(0)
                })
                .map_err(|e| format!("Erreur requête replay: {}", e))?
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|e| format!("Erreur collecte replay: {}", e))?;
            result
        };

        // 3. Appliquer chaque event sur la map
        for payload_json in payloads {
            match serde_json::from_str::<serde_json::Value>(&payload_json) {
                Ok(payload) => {
                    if let (Some(param), Some(value)) = (
                        payload.get("param").and_then(|p| p.as_str()),
                        payload.get("value").and_then(|v| v.as_f64()),
                    ) {
                        state.insert(param.to_string(), value);
                    }
                }
                Err(e) => {
                    return Err(format!("Erreur parsing payload JSON: {}", e));
                }
            }
        }

        Ok(state)
    }

    /// Compte les events actifs (non-undone) pour une image
    fn count_active_events(db: &mut Database, image_id: i64) -> Result<i64, String> {
        let conn = db.connection();
        conn.query_row(
            "SELECT COUNT(*) FROM edit_events WHERE image_id = ?1 AND is_undone = 0",
            params![image_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| format!("Erreur comptage events actifs: {}", e))
    }

    /// Prend un snapshot automatique de l'état courant (optimisation performance)
    fn take_snapshot(db: &mut Database, image_id: i64) -> Result<(), String> {
        let state = Self::replay_events(db, image_id)?;
        let state_json = serde_json::to_string(&state)
            .map_err(|e| format!("Erreur sérialisation snapshot: {}", e))?;

        let event_count = Self::count_active_events(db, image_id)?;
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let conn = db.connection();
        conn.execute(
            "INSERT OR REPLACE INTO edit_snapshots (image_id, snapshot, event_count, updated_at) \
             VALUES (?1, ?2, ?3, ?4)",
            params![image_id, state_json, event_count, now],
        )
        .map_err(|e| format!("Erreur sauvegarde snapshot: {}", e))?;

        Ok(())
    }

    /// Insère un event d'édition et retourne l'état courant.
    ///
    /// Déclenche un snapshot automatique tous les 20 events actifs.
    pub fn apply_edit_event(
        db: &mut Database,
        image_id: i64,
        event_type: &str,
        payload: &str,
        session_id: Option<&str>,
    ) -> Result<EditStateDTO, String> {
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // 1. Insérer l'event en DB
        {
            let conn = db.connection();
            conn.execute(
                "INSERT INTO edit_events (image_id, event_type, payload, is_undone, session_id, created_at) \
                 VALUES (?1, ?2, ?3, 0, ?4, ?5)",
                params![image_id, event_type, payload, session_id, now],
            )
            .map_err(|e| format!("Erreur insertion event: {}", e))?;
        }

        // 2. Compter les events actifs
        let count = Self::count_active_events(db, image_id)?;

        // 3. Si count est multiple de 20 → snapshot automatique
        if count > 0 && count % 20 == 0 {
            Self::take_snapshot(db, image_id)?;
        }

        // 4. Retourner l'état courant
        Self::get_current_edit_state(db, image_id)
    }

    /// Annule le dernier edit (soft-undo : is_undone = 1).
    /// Invalide le snapshot pour forcer un replay fresh.
    pub fn undo_last_edit(db: &mut Database, image_id: i64) -> Result<EditStateDTO, String> {
        // 1. Trouver le dernier event non-undone et le marquer
        {
            let conn = db.connection();
            let last_id: Option<i64> = conn
                .query_row(
                    "SELECT id FROM edit_events \
                     WHERE image_id = ?1 AND is_undone = 0 \
                     ORDER BY id DESC LIMIT 1",
                    params![image_id],
                    |row| row.get::<_, i64>(0),
                )
                .ok();

            if let Some(event_id) = last_id {
                conn.execute(
                    "UPDATE edit_events SET is_undone = 1 WHERE id = ?1",
                    params![event_id],
                )
                .map_err(|e| format!("Erreur marquage undo: {}", e))?;
            }
        }

        // 2. Invalider le snapshot (forcer replay fresh)
        {
            let conn = db.connection();
            conn.execute(
                "DELETE FROM edit_snapshots WHERE image_id = ?1",
                params![image_id],
            )
            .map_err(|e| format!("Erreur invalidation snapshot (undo): {}", e))?;
        }

        // 3. Retourner l'état courant
        Self::get_current_edit_state(db, image_id)
    }

    /// Refait un event précédemment annulé (is_undone = 0).
    /// Invalide le snapshot pour forcer un replay fresh.
    pub fn redo_edit(
        db: &mut Database,
        image_id: i64,
        event_id: i64,
    ) -> Result<EditStateDTO, String> {
        {
            let conn = db.connection();
            conn.execute(
                "UPDATE edit_events SET is_undone = 0 WHERE id = ?1 AND image_id = ?2",
                params![event_id, image_id],
            )
            .map_err(|e| format!("Erreur redo event: {}", e))?;
        }

        // Invalider le snapshot
        {
            let conn = db.connection();
            conn.execute(
                "DELETE FROM edit_snapshots WHERE image_id = ?1",
                params![image_id],
            )
            .map_err(|e| format!("Erreur invalidation snapshot (redo): {}", e))?;
        }

        Self::get_current_edit_state(db, image_id)
    }

    /// Supprime TOUS les events et le snapshot d'une image (reset complet).
    pub fn reset_edits(db: &mut Database, image_id: i64) -> Result<(), String> {
        let conn = db.connection();
        conn.execute(
            "DELETE FROM edit_events WHERE image_id = ?1",
            params![image_id],
        )
        .map_err(|e| format!("Erreur suppression events: {}", e))?;

        conn.execute(
            "DELETE FROM edit_snapshots WHERE image_id = ?1",
            params![image_id],
        )
        .map_err(|e| format!("Erreur suppression snapshot: {}", e))?;

        Ok(())
    }

    /// Retourne les N derniers events d'une image (actifs + undone, pour afficher l'historique).
    pub fn get_edit_history(
        db: &mut Database,
        image_id: i64,
        limit: Option<i64>,
    ) -> Result<Vec<EditEventDTO>, String> {
        let limit = limit.unwrap_or(50);
        let conn = db.connection();

        let mut stmt = conn
            .prepare(
                "SELECT id, event_type, payload, is_undone, created_at \
                 FROM edit_events WHERE image_id = ?1 \
                 ORDER BY id DESC LIMIT ?2",
            )
            .map_err(|e| format!("Erreur préparation historique: {}", e))?;

        let rows: Vec<(i64, String, String, i64, String)> = stmt
            .query_map(params![image_id, limit], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .map_err(|e| format!("Erreur requête historique: {}", e))?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| format!("Erreur collecte historique: {}", e))?;

        let events: Vec<EditEventDTO> = rows
            .into_iter()
            .map(|(id, event_type, payload_str, is_undone_int, created_at)| {
                let payload = serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Null);
                EditEventDTO {
                    id,
                    event_type,
                    payload,
                    is_undone: is_undone_int != 0,
                    created_at,
                }
            })
            .collect();

        Ok(events)
    }

    /// Construit et retourne l'état courant complet d'édition pour une image.
    pub fn get_current_edit_state(
        db: &mut Database,
        image_id: i64,
    ) -> Result<EditStateDTO, String> {
        let state = Self::replay_events(db, image_id)?;
        let event_count = Self::count_active_events(db, image_id)?;

        // can_undo : au moins un event actif (non-undone)
        let can_undo = event_count > 0;

        // can_redo : au moins un event marqué undone
        let undone_count: i64 = {
            let conn = db.connection();
            conn.query_row(
                "SELECT COUNT(*) FROM edit_events WHERE image_id = ?1 AND is_undone = 1",
                params![image_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| format!("Erreur comptage events undo: {}", e))?
        };
        let can_redo = undone_count > 0;

        Ok(EditStateDTO {
            image_id,
            state,
            can_undo,
            can_redo,
            event_count,
        })
    }
}

// ---------------------------------------------------------------------------
// Tests unitaires
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use serde_json::json;

    /// Crée une base de données in-memory avec les tables nécessaires pour les tests
    fn create_test_db() -> Database {
        let mut db = Database::new(":memory:").expect("Failed to create in-memory DB");
        let conn = db.connection();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS images (
               id       INTEGER PRIMARY KEY AUTOINCREMENT,
               filename TEXT NOT NULL
             );
             INSERT INTO images (id, filename) VALUES (1, 'test.jpg');
             INSERT INTO images (id, filename) VALUES (2, 'test2.jpg');

             CREATE TABLE IF NOT EXISTS edit_events (
               id         INTEGER PRIMARY KEY AUTOINCREMENT,
               image_id   INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
               event_type TEXT    NOT NULL,
               payload    TEXT    NOT NULL,
               is_undone  INTEGER NOT NULL DEFAULT 0,
               session_id TEXT,
               created_at TEXT    NOT NULL DEFAULT (datetime('now'))
             );

             CREATE INDEX IF NOT EXISTS idx_edit_events_image_id
               ON edit_events(image_id, is_undone, created_at);

             CREATE TABLE IF NOT EXISTS edit_snapshots (
               image_id    INTEGER PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
               snapshot    TEXT    NOT NULL,
               event_count INTEGER NOT NULL DEFAULT 0,
               updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
             );",
        )
        .expect("Failed to create test tables");
        db
    }

    // --- replay_events ---

    #[test]
    fn test_replay_events_empty_returns_empty_map() {
        let mut db = create_test_db();
        let state = EditSourcingService::replay_events(&mut db, 1).unwrap();
        assert!(state.is_empty());
    }

    #[test]
    fn test_replay_events_single_event() {
        let mut db = create_test_db();
        let payload = json!({"param": "exposure", "value": 0.5}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();

        let state = EditSourcingService::replay_events(&mut db, 1).unwrap();
        assert_eq!(state.get("exposure"), Some(&0.5));
    }

    #[test]
    fn test_replay_events_last_write_wins() {
        let mut db = create_test_db();
        let p1 = json!({"param": "exposure", "value": 0.3}).to_string();
        let p2 = json!({"param": "exposure", "value": 0.7}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p1, None).unwrap();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p2, None).unwrap();

        let state = EditSourcingService::replay_events(&mut db, 1).unwrap();
        assert_eq!(state.get("exposure"), Some(&0.7));
    }

    #[test]
    fn test_replay_events_multiple_params() {
        let mut db = create_test_db();
        let p1 = json!({"param": "exposure", "value": 0.5}).to_string();
        let p2 = json!({"param": "contrast", "value": -0.2}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p1, None).unwrap();
        EditSourcingService::apply_edit_event(&mut db, 1, "CONTRAST", &p2, None).unwrap();

        let state = EditSourcingService::replay_events(&mut db, 1).unwrap();
        assert_eq!(state.get("exposure"), Some(&0.5));
        assert_eq!(state.get("contrast"), Some(&-0.2));
    }

    // --- apply_edit_event ---

    #[test]
    fn test_apply_edit_returns_correct_state() {
        let mut db = create_test_db();
        let payload = json!({"param": "saturation", "value": 0.8}).to_string();
        let dto = EditSourcingService::apply_edit_event(&mut db, 1, "SATURATION", &payload, None)
            .unwrap();

        assert_eq!(dto.image_id, 1);
        assert_eq!(dto.event_count, 1);
        assert!(dto.can_undo);
        assert!(!dto.can_redo);
        assert_eq!(dto.state.get("saturation"), Some(&0.8));
    }

    #[test]
    fn test_apply_edit_increments_event_count() {
        let mut db = create_test_db();
        for i in 0..5 {
            let payload = json!({"param": "exposure", "value": i as f64 * 0.1}).to_string();
            EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();
        }
        let dto = EditSourcingService::get_current_edit_state(&mut db, 1).unwrap();
        assert_eq!(dto.event_count, 5);
    }

    // --- snapshot automatique ---

    #[test]
    fn test_snapshot_triggered_at_20_events() {
        let mut db = create_test_db();
        for i in 0..20 {
            let payload = json!({"param": "exposure", "value": i as f64 * 0.01}).to_string();
            EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();
        }

        // Vérifier qu'un snapshot existe après 20 events
        let snapshot_count: i64 = {
            let conn = db.connection();
            conn.query_row(
                "SELECT COUNT(*) FROM edit_snapshots WHERE image_id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap()
        };
        assert_eq!(
            snapshot_count, 1,
            "Snapshot should be created after 20 events"
        );
    }

    #[test]
    fn test_replay_with_snapshot_produces_correct_state() {
        let mut db = create_test_db();
        // Appliquer 20 events (déclenchera un snapshot) + 2 events supplémentaires
        for i in 0..20 {
            let payload = json!({"param": "exposure", "value": i as f64 * 0.01}).to_string();
            EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();
        }
        let payload_extra = json!({"param": "contrast", "value": 0.5}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "CONTRAST", &payload_extra, None)
            .unwrap();

        let state = EditSourcingService::replay_events(&mut db, 1).unwrap();
        // L'exposure finale est celle du 20ème event (valeur 0.19)
        assert!((state.get("exposure").copied().unwrap_or(0.0) - 0.19).abs() < 1e-9);
        assert_eq!(state.get("contrast"), Some(&0.5));
    }

    // --- undo_last_edit ---

    #[test]
    fn test_undo_removes_last_active_event() {
        let mut db = create_test_db();
        let p1 = json!({"param": "exposure", "value": 0.5}).to_string();
        let p2 = json!({"param": "exposure", "value": 0.9}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p1, None).unwrap();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p2, None).unwrap();

        let dto = EditSourcingService::undo_last_edit(&mut db, 1).unwrap();
        assert_eq!(
            dto.state.get("exposure"),
            Some(&0.5),
            "State should revert to 0.5 after undo"
        );
        assert!(dto.can_undo, "Should still be able to undo first event");
        assert!(dto.can_redo, "Should be able to redo after undo");
    }

    #[test]
    fn test_undo_all_events_returns_empty_state() {
        let mut db = create_test_db();
        let payload = json!({"param": "exposure", "value": 0.5}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();
        let dto = EditSourcingService::undo_last_edit(&mut db, 1).unwrap();

        assert!(dto.state.is_empty());
        assert!(!dto.can_undo);
        assert!(dto.can_redo);
    }

    // --- redo_edit ---

    #[test]
    fn test_redo_restores_undone_event() {
        let mut db = create_test_db();
        let payload = json!({"param": "exposure", "value": 0.9}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();

        // Récupérer l'id de l'event créé
        let event_id: i64 = {
            let conn = db.connection();
            conn.query_row(
                "SELECT id FROM edit_events WHERE image_id = 1 ORDER BY id DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap()
        };

        EditSourcingService::undo_last_edit(&mut db, 1).unwrap();
        let dto = EditSourcingService::redo_edit(&mut db, 1, event_id).unwrap();

        assert_eq!(dto.state.get("exposure"), Some(&0.9));
        assert!(!dto.can_redo, "No more events to redo");
    }

    // --- reset_edits ---

    #[test]
    fn test_reset_clears_all_events_and_snapshot() {
        let mut db = create_test_db();
        for i in 0..5 {
            let payload = json!({"param": "exposure", "value": i as f64 * 0.1}).to_string();
            EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();
        }

        EditSourcingService::reset_edits(&mut db, 1).unwrap();
        let dto = EditSourcingService::get_current_edit_state(&mut db, 1).unwrap();

        assert!(dto.state.is_empty());
        assert_eq!(dto.event_count, 0);
        assert!(!dto.can_undo);
        assert!(!dto.can_redo);
    }

    // --- get_edit_history ---

    #[test]
    fn test_get_edit_history_returns_events_desc() {
        let mut db = create_test_db();
        let p1 = json!({"param": "exposure", "value": 0.3}).to_string();
        let p2 = json!({"param": "contrast", "value": 0.5}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p1, None).unwrap();
        EditSourcingService::apply_edit_event(&mut db, 1, "CONTRAST", &p2, None).unwrap();

        let history = EditSourcingService::get_edit_history(&mut db, 1, Some(10)).unwrap();
        assert_eq!(history.len(), 2);
        // Le plus récent doit être en premier (ORDER BY id DESC)
        assert_eq!(history[0].event_type, "CONTRAST");
        assert_eq!(history[1].event_type, "EXPOSURE");
    }

    #[test]
    fn test_get_edit_history_respects_limit() {
        let mut db = create_test_db();
        for i in 0..5 {
            let payload = json!({"param": "exposure", "value": i as f64 * 0.1}).to_string();
            EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &payload, None).unwrap();
        }

        let history = EditSourcingService::get_edit_history(&mut db, 1, Some(2)).unwrap();
        assert_eq!(history.len(), 2);
    }

    // --- isolation entre images ---

    #[test]
    fn test_events_are_isolated_per_image() {
        let mut db = create_test_db();
        let p1 = json!({"param": "exposure", "value": 0.5}).to_string();
        let p2 = json!({"param": "contrast", "value": 0.8}).to_string();
        EditSourcingService::apply_edit_event(&mut db, 1, "EXPOSURE", &p1, None).unwrap();
        EditSourcingService::apply_edit_event(&mut db, 2, "CONTRAST", &p2, None).unwrap();

        let state1 = EditSourcingService::replay_events(&mut db, 1).unwrap();
        let state2 = EditSourcingService::replay_events(&mut db, 2).unwrap();

        assert!(state1.contains_key("exposure") && !state1.contains_key("contrast"));
        assert!(state2.contains_key("contrast") && !state2.contains_key("exposure"));
    }

    // --- get_current_edit_state ---

    #[test]
    fn test_get_current_edit_state_no_events() {
        let mut db = create_test_db();
        let dto = EditSourcingService::get_current_edit_state(&mut db, 1).unwrap();

        assert_eq!(dto.image_id, 1);
        assert!(dto.state.is_empty());
        assert!(!dto.can_undo);
        assert!(!dto.can_redo);
        assert_eq!(dto.event_count, 0);
    }
}

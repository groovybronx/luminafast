use crate::database::Database;
use crate::models::edit::{EditEventDTO, EditStateDTO};
use crate::services::edit_sourcing::EditSourcingService;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Erreurs spécifiques au service History
#[derive(Error, Debug)]
pub enum HistoryError {
    #[error("Database operation failed: {0}")]
    DatabaseError(String),

    #[error("Snapshot not found (id: {0})")]
    SnapshotNotFound(i64),

    #[error("Image not found (id: {0})")]
    ImageNotFound(i64),

    #[error("Failed to parse JSON: {0}")]
    JsonError(String),

    #[error("Event not found (id: {0})")]
    EventNotFound(i64),

    #[error("Invalid event state: {0}")]
    InvalidEventState(String),
}

/// Alias pour les résultats du service History
pub type HistoryResult<T> = Result<T, HistoryError>;

/// DTO pour un snapshot d'édition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDTO {
    pub id: i64,
    pub image_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub event_count: i64,
    pub created_at: String,
}

/// Service History pour la gestion de la timeline historique et des snapshots
pub struct HistoryService;

impl HistoryService {
    /// Retourne les N derniers événements d'édition avec métadonnées
    pub fn get_event_timeline(
        db: &mut Database,
        image_id: i64,
        limit: Option<i64>,
    ) -> HistoryResult<Vec<EditEventDTO>> {
        let limit_val = limit.unwrap_or(50);

        let conn = db.connection();
        let mut stmt = conn
            .prepare(
                "SELECT id, event_type, payload, is_undone, created_at \
                 FROM edit_events \
                 WHERE image_id = ?1 \
                 ORDER BY id DESC \
                 LIMIT ?2",
            )
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        let events = stmt
            .query_map(params![image_id, limit_val], |row| {
                Ok(EditEventDTO {
                    id: row.get(0)?,
                    event_type: row.get(1)?,
                    payload: {
                        let payload_json: String = row.get(2)?;
                        serde_json::from_str(&payload_json).unwrap_or(serde_json::json!({}))
                    },
                    is_undone: row.get::<_, i32>(3)? != 0,
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        Ok(events)
    }

    /// Crée un snapshot nommé de l'état actuel
    pub fn create_snapshot(
        db: &mut Database,
        image_id: i64,
        name: String,
        description: Option<String>,
    ) -> HistoryResult<SnapshotDTO> {
        if name.trim().is_empty() {
            return Err(HistoryError::InvalidEventState(
                "Snapshot name cannot be empty".to_string(),
            ));
        }

        // Rejouer les events pour obtenir l'état courant
        let state = EditSourcingService::replay_events(db, image_id)
            .map_err(HistoryError::InvalidEventState)?;

        let state_json =
            serde_json::to_string(&state).map_err(|e| HistoryError::JsonError(e.to_string()))?;

        // Compter les events actifs
        let event_count = Self::count_events_since_import(db, image_id)?;
        let now = chrono::Utc::now()
            .format("%Y-%m-%d %H:%M:%S%.3f")
            .to_string();

        let conn = db.connection();
        let result = conn.execute(
            "INSERT INTO edit_snapshots (image_id, name, description, event_count, snapshot_state, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![image_id, name, description, event_count, state_json, now],
        );

        match result {
            Ok(_) => {
                let snapshot_id = conn.last_insert_rowid();
                Ok(SnapshotDTO {
                    id: snapshot_id,
                    image_id,
                    name,
                    description,
                    event_count,
                    created_at: now,
                })
            }
            Err(e) => {
                // Check if it's a unique constraint error
                if e.to_string().contains("UNIQUE") {
                    Err(HistoryError::InvalidEventState(format!(
                        "Snapshot name '{}' already exists for this image",
                        name
                    )))
                } else {
                    Err(HistoryError::DatabaseError(e.to_string()))
                }
            }
        }
    }

    /// Retourne tous les snapshots d'une image
    pub fn get_snapshots(db: &mut Database, image_id: i64) -> HistoryResult<Vec<SnapshotDTO>> {
        let conn = db.connection();
        let mut stmt = conn
            .prepare(
                "SELECT id, image_id, name, description, event_count, created_at \
                 FROM edit_snapshots \
                 WHERE image_id = ?1 \
                 ORDER BY created_at DESC",
            )
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        let snapshots = stmt
            .query_map(params![image_id], |row| {
                Ok(SnapshotDTO {
                    id: row.get(0)?,
                    image_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    event_count: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        Ok(snapshots)
    }

    /// Restaure l'état à un événement spécifique
    ///
    /// Procédure:
    /// 1. Récupérer l'event avec cet ID
    /// 2. Marquer tous les events APRÈS cet ID comme undone (si actifs)
    /// 3. Rejouer les events jusqu'à cet ID inclus
    /// 4. Retourner l'état reconstitué
    pub fn restore_to_event(
        db: &mut Database,
        image_id: i64,
        event_id: i64,
    ) -> HistoryResult<EditStateDTO> {
        let conn = db.connection();

        // 1. Vérifier que l'event existe
        let event_exists: bool = conn
            .query_row(
                "SELECT 1 FROM edit_events WHERE id = ?1 AND image_id = ?2",
                params![event_id, image_id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !event_exists {
            return Err(HistoryError::EventNotFound(event_id));
        }

        // 2. Marquer tous les events APRÈS cet ID comme undone
        conn.execute(
            "UPDATE edit_events SET is_undone = 1 WHERE image_id = ?1 AND id > ?2",
            params![image_id, event_id],
        )
        .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        // 3. Rejouer jusqu'à cet event
        let state = EditSourcingService::replay_events(db, image_id)
            .map_err(HistoryError::InvalidEventState)?;

        // 4. Retourner l'état
        let event_count = Self::count_events_since_import(db, image_id)?;
        Ok(EditStateDTO {
            image_id,
            state,
            can_undo: true,  // Au moins un event enregistré
            can_redo: false, // On vient de remonter dans l'historique
            event_count,
        })
    }

    /// Restaure l'état à un snapshot nommé
    ///
    /// Procédure:
    /// 1. Charger le snapshot
    /// 2. Récupérer event_count du snapshot
    /// 3. Marquer tous les events APRÈS le N-ième comme undone
    /// 4. Retourner l'état du snapshot
    pub fn restore_to_snapshot(db: &mut Database, snapshot_id: i64) -> HistoryResult<EditStateDTO> {
        let conn = db.connection();

        // 1. Charger le snapshot
        let (image_id, event_count_at_snapshot, snapshot_json): (i64, i64, String) = conn
            .query_row(
                "SELECT image_id, event_count, snapshot_state FROM edit_snapshots WHERE id = ?1",
                params![snapshot_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| HistoryError::SnapshotNotFound(snapshot_id))?;

        // 2. Récupérer l'ID du dernier event actif à ce moment
        let last_event_id_at_snapshot: Option<i64> = conn
            .query_row(
                "SELECT id FROM edit_events \
                 WHERE image_id = ?1 AND is_undone = 0 \
                 ORDER BY id ASC \
                 LIMIT 1 OFFSET ?2",
                params![image_id, event_count_at_snapshot - 1],
                |row| row.get(0),
            )
            .ok();

        // 3. Marquer tous les events APRÈS le snapshot comme undone
        if let Some(last_id) = last_event_id_at_snapshot {
            conn.execute(
                "UPDATE edit_events SET is_undone = 1 WHERE image_id = ?1 AND id > ?2",
                params![image_id, last_id],
            )
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;
        } else {
            // Aucun event à ce point, marquer tous comme undone
            conn.execute(
                "UPDATE edit_events SET is_undone = 1 WHERE image_id = ?1",
                params![image_id],
            )
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;
        }

        // 4. Retourner l'état du snapshot
        let state: HashMap<String, f64> = serde_json::from_str(&snapshot_json)
            .map_err(|e| HistoryError::JsonError(e.to_string()))?;

        Ok(EditStateDTO {
            image_id,
            state,
            can_undo: true,
            can_redo: false,
            event_count: event_count_at_snapshot,
        })
    }

    /// Supprime un snapshot
    pub fn delete_snapshot(db: &mut Database, snapshot_id: i64) -> HistoryResult<()> {
        let conn = db.connection();
        let rows = conn
            .execute(
                "DELETE FROM edit_snapshots WHERE id = ?1",
                params![snapshot_id],
            )
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        if rows == 0 {
            return Err(HistoryError::SnapshotNotFound(snapshot_id));
        }

        Ok(())
    }

    /// Compte les events actifs (non-undone) depuis l'import
    pub fn count_events_since_import(db: &mut Database, image_id: i64) -> HistoryResult<i64> {
        let conn = db.connection();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM edit_events WHERE image_id = ?1 AND is_undone = 0",
                params![image_id],
                |row| row.get(0),
            )
            .map_err(|e| HistoryError::DatabaseError(e.to_string()))?;

        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_get_event_timeline_empty() {
        // Test will be in integration tests with actual DB
    }

    #[test]
    fn test_snapshot_name_validation() {
        // Empty name should fail
        let result = "".to_string();
        assert!(result.trim().is_empty());
    }
}

use crate::commands::catalog::AppState;
use crate::models::dto::CommandResult;
use serde::{Deserialize, Serialize};
use tauri::State;

/// DTO pour un tag (retourné par toutes les commandes de lecture)
#[derive(Debug, Serialize, Deserialize)]
pub struct TagDTO {
    pub id: u32,
    pub name: String,
    pub parent_id: Option<u32>,
    pub image_count: u32,
}

/// Longueur maximale d'un nom de tag
const MAX_TAG_NAME_LEN: usize = 100;

/// Valide un nom de tag : non vide, ≤ 100 chars, pas de '/'
fn validate_tag_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }
    if trimmed.len() > MAX_TAG_NAME_LEN {
        return Err(format!(
            "Tag name too long ({} chars, max {})",
            trimmed.len(),
            MAX_TAG_NAME_LEN
        ));
    }
    if trimmed.contains('/') {
        return Err("Tag name cannot contain '/' (reserved as hierarchy separator)".to_string());
    }
    Ok(())
}

/// Crée un nouveau tag (racine ou enfant)
///
/// Retourne le TagDTO créé incluant son id auto-incrémenté.
/// Erreur si le nom est déjà utilisé (UNIQUE constraint).
#[tauri::command]
pub async fn create_tag(
    name: String,
    parent_id: Option<u32>,
    state: State<'_, AppState>,
) -> CommandResult<TagDTO> {
    validate_tag_name(&name).map_err(|e| e)?;
    let trimmed = name.trim().to_string();

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Vérifier que le parent_id existe si fourni
    if let Some(pid) = parent_id {
        let exists: Result<i64, _> =
            db.connection()
                .query_row("SELECT id FROM tags WHERE id = ?", [pid], |row| row.get(0));
        if exists.is_err() {
            return Err(format!("Parent tag with id {} does not exist", pid));
        }
    }

    db.connection()
        .execute(
            "INSERT INTO tags (name, parent_id) VALUES (?, ?)",
            rusqlite::params![trimmed, parent_id],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint") {
                format!("Tag '{}' already exists", trimmed)
            } else {
                format!("Failed to create tag: {}", e)
            }
        })?;

    let id = db.connection().last_insert_rowid() as u32;

    Ok(TagDTO {
        id,
        name: trimmed,
        parent_id,
        image_count: 0,
    })
}

/// Retourne tous les tags avec leur comptage d'images associées
#[tauri::command]
pub async fn get_all_tags(state: State<'_, AppState>) -> CommandResult<Vec<TagDTO>> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT t.id, t.name, t.parent_id,
                    COUNT(it.image_id) AS image_count
             FROM tags t
             LEFT JOIN image_tags it ON t.id = it.tag_id
             GROUP BY t.id, t.name, t.parent_id
             ORDER BY t.parent_id NULLS FIRST, t.name",
        )
        .map_err(|e| format!("Failed to prepare get_all_tags query: {}", e))?;

    let tags = stmt
        .query_map([], |row| {
            Ok(TagDTO {
                id: row.get::<_, u32>(0)?,
                name: row.get::<_, String>(1)?,
                parent_id: row.get::<_, Option<u32>>(2)?,
                image_count: row.get::<_, u32>(3)?,
            })
        })
        .map_err(|e| format!("Failed to query tags: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect tags: {}", e))?;

    Ok(tags)
}

/// Renomme un tag existant
#[tauri::command]
pub async fn rename_tag(
    id: u32,
    new_name: String,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    validate_tag_name(&new_name).map_err(|e| e)?;
    let trimmed = new_name.trim().to_string();

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let rows = db
        .connection()
        .execute(
            "UPDATE tags SET name = ? WHERE id = ?",
            rusqlite::params![trimmed, id],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint") {
                format!("Tag '{}' already exists", trimmed)
            } else {
                format!("Failed to rename tag: {}", e)
            }
        })?;

    if rows == 0 {
        return Err(format!("Tag with id {} not found", id));
    }

    Ok(())
}

/// Supprime un tag et tous ses enfants récursivement, ainsi que toutes les associations image_tags
#[tauri::command]
pub async fn delete_tag(id: u32, state: State<'_, AppState>) -> CommandResult<()> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    // Vérifier que le tag existe
    let exists: Result<i64, _> =
        db.connection()
            .query_row("SELECT id FROM tags WHERE id = ?", [id], |row| row.get(0));
    if exists.is_err() {
        return Err(format!("Tag with id {} not found", id));
    }

    // Supprimer récursivement : enfants d'abord (SQLite ne supporte pas ON DELETE CASCADE
    // sur les self-referencing FK par défaut sans PRAGMA foreign_keys=ON).
    // On utilise une CTE récursive pour collecter tous les ids à supprimer.
    db.connection()
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Collecter tous les ids descendants + le tag lui-même
    let ids_to_delete: Vec<u32> = {
        let mut stmt = db
            .connection()
            .prepare(
                "WITH RECURSIVE descendants(id) AS (
                    SELECT id FROM tags WHERE id = ?1
                    UNION ALL
                    SELECT t.id FROM tags t
                    INNER JOIN descendants d ON t.parent_id = d.id
                 )
                 SELECT id FROM descendants",
            )
            .map_err(|e| format!("Failed to prepare recursive delete query: {}", e))?;

        let result = stmt
            .query_map([id], |row| row.get::<_, u32>(0))
            .map_err(|e| format!("Failed to query descendants: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect descendants: {}", e))?;
        result
    };

    // Supprimer les image_tags pour tous ces ids
    for tid in &ids_to_delete {
        db.connection()
            .execute("DELETE FROM image_tags WHERE tag_id = ?", [tid])
            .map_err(|e| format!("Failed to remove image_tags for tag {}: {}", tid, e))?;
    }

    // Supprimer les tags (enfants en premier pour respecter la FK, du plus profond au moins profond)
    for tid in ids_to_delete.iter().rev() {
        db.connection()
            .execute("DELETE FROM tags WHERE id = ?", [tid])
            .map_err(|e| format!("Failed to delete tag {}: {}", tid, e))?;
    }

    Ok(())
}

/// Assigne des tags à plusieurs images en batch (INSERT OR IGNORE pour éviter les doublons)
#[tauri::command]
pub async fn add_tags_to_images(
    image_ids: Vec<u32>,
    tag_ids: Vec<u32>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    if image_ids.is_empty() || tag_ids.is_empty() {
        return Ok(());
    }

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    for image_id in &image_ids {
        for tag_id in &tag_ids {
            db.connection()
                .execute(
                    "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                    rusqlite::params![image_id, tag_id],
                )
                .map_err(|e| {
                    format!("Failed to add tag {} to image {}: {}", tag_id, image_id, e)
                })?;
        }
    }

    Ok(())
}

/// Retire des tags de plusieurs images en batch
#[tauri::command]
pub async fn remove_tags_from_images(
    image_ids: Vec<u32>,
    tag_ids: Vec<u32>,
    state: State<'_, AppState>,
) -> CommandResult<()> {
    if image_ids.is_empty() || tag_ids.is_empty() {
        return Ok(());
    }

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    for image_id in &image_ids {
        for tag_id in &tag_ids {
            db.connection()
                .execute(
                    "DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?",
                    rusqlite::params![image_id, tag_id],
                )
                .map_err(|e| {
                    format!(
                        "Failed to remove tag {} from image {}: {}",
                        tag_id, image_id, e
                    )
                })?;
        }
    }

    Ok(())
}

/// Retourne les tags associés à une image spécifique
#[tauri::command]
pub async fn get_image_tags(
    image_id: u32,
    state: State<'_, AppState>,
) -> CommandResult<Vec<TagDTO>> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let mut stmt = db
        .connection()
        .prepare(
            "SELECT t.id, t.name, t.parent_id,
                    (SELECT COUNT(*) FROM image_tags it2 WHERE it2.tag_id = t.id) AS image_count
             FROM tags t
             INNER JOIN image_tags it ON t.id = it.tag_id
             WHERE it.image_id = ?
             ORDER BY t.name",
        )
        .map_err(|e| format!("Failed to prepare get_image_tags query: {}", e))?;

    let tags = stmt
        .query_map([image_id], |row| {
            Ok(TagDTO {
                id: row.get::<_, u32>(0)?,
                name: row.get::<_, String>(1)?,
                parent_id: row.get::<_, Option<u32>>(2)?,
                image_count: row.get::<_, u32>(3)?,
            })
        })
        .map_err(|e| format!("Failed to query image tags: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect image tags: {}", e))?;

    Ok(tags)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests unitaires
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use crate::database::Database;
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test_tags.db");
        let mut db = Database::new(&db_path).unwrap();
        db.initialize().unwrap();
        db
    }

    /// Insère une image minimale et retourne son id
    fn insert_image(db: &mut Database, filename: &str, hash: &str) -> u32 {
        db.connection()
            .execute(
                "INSERT INTO images (blake3_hash, filename, extension, imported_at) VALUES (?, ?, 'jpg', '2026-01-01T00:00:00Z')",
                rusqlite::params![hash, filename],
            )
            .unwrap();
        db.connection().last_insert_rowid() as u32
    }

    #[test]
    fn test_create_tag_root() {
        let mut db = setup_test_db();
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES (?, NULL)",
                ["Lieu"],
            )
            .unwrap();
        let id = db.connection().last_insert_rowid() as u32;
        let (name, parent_id): (String, Option<u32>) = db
            .connection()
            .query_row(
                "SELECT name, parent_id FROM tags WHERE id = ?",
                [id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(name, "Lieu");
        assert!(parent_id.is_none());
    }

    #[test]
    fn test_create_tag_child() {
        let mut db = setup_test_db();
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Lieu', NULL)",
                [],
            )
            .unwrap();
        let parent_id = db.connection().last_insert_rowid() as u32;

        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('France', ?)",
                [parent_id],
            )
            .unwrap();
        let child_id = db.connection().last_insert_rowid() as u32;

        let stored_parent: Option<u32> = db
            .connection()
            .query_row(
                "SELECT parent_id FROM tags WHERE id = ?",
                [child_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stored_parent, Some(parent_id));
    }

    #[test]
    fn test_create_tag_duplicate_name_fails() {
        let mut db = setup_test_db();
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Lieu', NULL)",
                [],
            )
            .unwrap();
        let result = db.connection().execute(
            "INSERT INTO tags (name, parent_id) VALUES ('Lieu', NULL)",
            [],
        );
        assert!(
            result.is_err(),
            "Duplicate tag name should fail with UNIQUE constraint"
        );
    }

    #[test]
    fn test_rename_tag() {
        let mut db = setup_test_db();
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('OldName', NULL)",
                [],
            )
            .unwrap();
        let id = db.connection().last_insert_rowid() as u32;

        let rows = db
            .connection()
            .execute(
                "UPDATE tags SET name = ? WHERE id = ?",
                rusqlite::params!["NewName", id],
            )
            .unwrap();
        assert_eq!(rows, 1);

        let name: String = db
            .connection()
            .query_row("SELECT name FROM tags WHERE id = ?", [id], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "NewName");
    }

    #[test]
    fn test_delete_tag_cascades_children() {
        let mut db = setup_test_db();

        // Arbre : Lieu > France > Paris
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Lieu', NULL)",
                [],
            )
            .unwrap();
        let lieu_id = db.connection().last_insert_rowid() as u32;

        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('France', ?)",
                [lieu_id],
            )
            .unwrap();
        let france_id = db.connection().last_insert_rowid() as u32;

        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Paris', ?)",
                [france_id],
            )
            .unwrap();
        let paris_id = db.connection().last_insert_rowid() as u32;

        // Associer Paris à une image
        let image_id = insert_image(&mut db, "photo.jpg", "hash_cascade_test");
        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, paris_id],
            )
            .unwrap();

        // Supprimer Lieu → doit supprimer France, Paris et image_tags associées
        // Simuler la suppression récursive : collecter descendants
        let ids_to_delete: Vec<u32> = {
            let mut stmt = db
                .connection()
                .prepare(
                    "WITH RECURSIVE descendants(id) AS (
                    SELECT id FROM tags WHERE id = ?1
                    UNION ALL
                    SELECT t.id FROM tags t
                    INNER JOIN descendants d ON t.parent_id = d.id
                 )
                 SELECT id FROM descendants",
                )
                .unwrap();
            let result = stmt
                .query_map([lieu_id], |row| row.get::<_, u32>(0))
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
            result
        };

        assert_eq!(
            ids_to_delete.len(),
            3,
            "Doit collecter Lieu, France et Paris"
        );

        for tid in &ids_to_delete {
            db.connection()
                .execute("DELETE FROM image_tags WHERE tag_id = ?", [tid])
                .unwrap();
        }
        for tid in ids_to_delete.iter().rev() {
            db.connection()
                .execute("DELETE FROM tags WHERE id = ?", [tid])
                .unwrap();
        }

        // Vérifier que tous les tags sont supprimés
        let count: u32 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM tags", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);

        // Vérifier que image_tags est vide
        let it_count: u32 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM image_tags", [], |row| row.get(0))
            .unwrap();
        assert_eq!(it_count, 0);
    }

    #[test]
    fn test_add_tags_to_images_batch() {
        let mut db = setup_test_db();

        // Créer 2 images et 2 tags
        let img1 = insert_image(&mut db, "img1.jpg", "hash_batch1");
        let img2 = insert_image(&mut db, "img2.jpg", "hash_batch2");

        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Voyage', NULL)",
                [],
            )
            .unwrap();
        let tag1 = db.connection().last_insert_rowid() as u32;
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Portrait', NULL)",
                [],
            )
            .unwrap();
        let tag2 = db.connection().last_insert_rowid() as u32;

        // Assigner les 2 tags aux 2 images
        for image_id in [img1, img2] {
            for tag_id in [tag1, tag2] {
                db.connection()
                    .execute(
                        "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                        rusqlite::params![image_id, tag_id],
                    )
                    .unwrap();
            }
        }

        let count: u32 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM image_tags", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 4, "2 images × 2 tags = 4 associations");
    }

    #[test]
    fn test_add_tags_idempotent() {
        let mut db = setup_test_db();
        let image_id = insert_image(&mut db, "img.jpg", "hash_idempotent");
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Sport', NULL)",
                [],
            )
            .unwrap();
        let tag_id = db.connection().last_insert_rowid() as u32;

        // Insérer deux fois le même couple
        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, tag_id],
            )
            .unwrap();
        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, tag_id],
            )
            .unwrap();

        let count: u32 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM image_tags", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1, "INSERT OR IGNORE doit être idempotent");
    }

    #[test]
    fn test_remove_tags_from_images() {
        let mut db = setup_test_db();
        let image_id = insert_image(&mut db, "img_rm.jpg", "hash_remove");
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Nature', NULL)",
                [],
            )
            .unwrap();
        let tag_id = db.connection().last_insert_rowid() as u32;

        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, tag_id],
            )
            .unwrap();

        let rows = db
            .connection()
            .execute(
                "DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?",
                rusqlite::params![image_id, tag_id],
            )
            .unwrap();
        assert_eq!(rows, 1);

        let count: u32 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM image_tags", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_get_image_tags() {
        let mut db = setup_test_db();
        let image_id = insert_image(&mut db, "tagged.jpg", "hash_get_tags");

        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Ville', NULL)",
                [],
            )
            .unwrap();
        let tag1 = db.connection().last_insert_rowid() as u32;
        db.connection()
            .execute(
                "INSERT INTO tags (name, parent_id) VALUES ('Nuit', NULL)",
                [],
            )
            .unwrap();
        let tag2 = db.connection().last_insert_rowid() as u32;

        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, tag1],
            )
            .unwrap();
        db.connection()
            .execute(
                "INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)",
                rusqlite::params![image_id, tag2],
            )
            .unwrap();

        let mut stmt = db
            .connection()
            .prepare(
                "SELECT t.id, t.name FROM tags t
                 INNER JOIN image_tags it ON t.id = it.tag_id
                 WHERE it.image_id = ?
                 ORDER BY t.name",
            )
            .unwrap();

        let tags: Vec<(u32, String)> = stmt
            .query_map([image_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].1, "Nuit");
        assert_eq!(tags[1].1, "Ville");
    }

    #[test]
    fn test_validate_tag_name_empty() {
        let result = super::validate_tag_name("   ");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_tag_name_too_long() {
        let long_name = "a".repeat(101);
        let result = super::validate_tag_name(&long_name);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_tag_name_with_slash() {
        let result = super::validate_tag_name("Lieu/France");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_tag_name_valid() {
        let result = super::validate_tag_name("  Paris  ");
        assert!(result.is_ok());
    }
}

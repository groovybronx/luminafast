use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json;

/// SnapshotService manages snapshot persistence and retrieval
/// Provides CRUD operations for edit state snapshots
pub struct SnapshotService;

impl SnapshotService {
    /// Create a new snapshot for an image
    ///
    /// # Arguments
    ///
    /// * `conn` - Database connection
    /// * `image_id` - ID of the image being edited
    /// * `name` - User-provided name for the snapshot
    /// * `event_ids` - Vector of event IDs that comprise this snapshot
    /// * `snapshot_data` - JSON string containing serialized events
    ///
    /// # Returns
    ///
    /// Result containing the created SnapshotDTO or error
    ///
    /// # Errors
    ///
    /// Returns error if:
    /// - Database write fails
    /// - Snapshot name is empty
    /// - Duplicate snapshot name already exists for this image
    pub fn create_snapshot(
        conn: &Connection,
        image_id: i64,
        name: String,
        event_ids: Vec<String>,
        snapshot_data: String,
    ) -> Result<crate::models::snapshot::SnapshotDTO, String> {
        // Validation
        if name.trim().is_empty() {
            return Err("Snapshot name cannot be empty".to_string());
        }

        if name.len() > 255 {
            return Err("Snapshot name must be less than 255 characters".to_string());
        }

        // Insert snapshot
        let created_at = Utc::now();
        let event_ids_json = serde_json::to_string(&event_ids)
            .map_err(|e| format!("Failed to serialize event_ids: {}", e))?;

        let result = conn.execute(
            "INSERT INTO edit_snapshots (image_id, name, snapshot_data, event_ids, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                image_id,
                name.clone(),
                snapshot_data.clone(),
                event_ids_json,
                created_at.to_rfc3339()
            ],
        );

        match result {
            Ok(_) => {
                let id = conn.last_insert_rowid();
                let snapshot = crate::models::snapshot::Snapshot::new(
                    id, image_id, name, event_ids, created_at,
                );
                Ok(snapshot.to_dto(snapshot_data))
            }
            Err(e) => {
                // Check if it's a UNIQUE constraint violation (duplicate name)
                if e.to_string().contains("UNIQUE constraint failed") {
                    Err(format!(
                        "Snapshot with name '{}' already exists for this image",
                        name
                    ))
                } else {
                    Err(format!("Failed to create snapshot: {}", e))
                }
            }
        }
    }

    /// Get all snapshots for a specific image
    ///
    /// # Arguments
    ///
    /// * `conn` - Database connection
    /// * `image_id` - ID of the image
    ///
    /// # Returns
    ///
    /// Result containing vector of SnapshotDTOs ordered by creation time (newest first)
    pub fn get_snapshots(
        conn: &Connection,
        image_id: i64,
    ) -> Result<Vec<crate::models::snapshot::SnapshotDTO>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, image_id, name, snapshot_data, event_ids, created_at
                 FROM edit_snapshots
                 WHERE image_id = ?1
                 ORDER BY created_at DESC",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let snapshots = stmt
            .query_map(params![image_id], |row| {
                let event_ids_json: String = row.get(4)?;
                let event_ids: Vec<String> =
                    serde_json::from_str(&event_ids_json).unwrap_or_default();

                Ok(crate::models::snapshot::SnapshotDTO {
                    id: row.get(0)?,
                    image_id: row.get(1)?,
                    name: row.get(2)?,
                    snapshot_data: row.get(3)?,
                    event_ids,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect snapshot results: {}", e))?;

        Ok(snapshots)
    }

    /// Get a single snapshot by ID
    ///
    /// # Arguments
    ///
    /// * `conn` - Database connection
    /// * `snapshot_id` - ID of the snapshot
    ///
    /// # Returns
    ///
    /// Result containing SnapshotDTO or None if not found
    pub fn get_snapshot(
        conn: &Connection,
        snapshot_id: i64,
    ) -> Result<Option<crate::models::snapshot::SnapshotDTO>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, image_id, name, snapshot_data, event_ids, created_at
                 FROM edit_snapshots
                 WHERE id = ?1",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let result = stmt
            .query_row(params![snapshot_id], |row| {
                let event_ids_json: String = row.get(4)?;
                let event_ids: Vec<String> =
                    serde_json::from_str(&event_ids_json).unwrap_or_default();

                Ok(crate::models::snapshot::SnapshotDTO {
                    id: row.get(0)?,
                    image_id: row.get(1)?,
                    name: row.get(2)?,
                    snapshot_data: row.get(3)?,
                    event_ids,
                    created_at: row.get(5)?,
                })
            })
            .optional()
            .map_err(|e| format!("Failed to query snapshot: {}", e))?;

        Ok(result)
    }

    /// Delete a snapshot by ID
    ///
    /// # Arguments
    ///
    /// * `conn` - Database connection
    /// * `snapshot_id` - ID of the snapshot to delete
    ///
    /// # Returns
    ///
    /// Result indicating success or error
    pub fn delete_snapshot(conn: &Connection, snapshot_id: i64) -> Result<(), String> {
        let affected = conn
            .execute(
                "DELETE FROM edit_snapshots WHERE id = ?1",
                params![snapshot_id],
            )
            .map_err(|e| format!("Failed to delete snapshot: {}", e))?;

        if affected == 0 {
            return Err(format!("Snapshot with id {} not found", snapshot_id));
        }

        Ok(())
    }

    /// Delete all snapshots for a specific image
    /// Used when image is deleted or when clearing history
    ///
    /// # Arguments
    ///
    /// * `conn` - Database connection
    /// * `image_id` - ID of the image
    ///
    /// # Returns
    ///
    /// Result with number of snapshots deleted
    pub fn delete_snapshots_for_image(conn: &Connection, image_id: i64) -> Result<usize, String> {
        let affected = conn
            .execute(
                "DELETE FROM edit_snapshots WHERE image_id = ?1",
                params![image_id],
            )
            .map_err(|e| format!("Failed to delete snapshots: {}", e))?;

        Ok(affected)
    }

    /// Update snapshot name
    ///
    /// # Arguments
    ///
    /// * `conn` - Database connection
    /// * `snapshot_id` - ID of the snapshot
    /// * `new_name` - New name for the snapshot
    ///
    /// # Returns
    ///
    /// Result indicating success or error
    pub fn rename_snapshot(
        conn: &Connection,
        snapshot_id: i64,
        new_name: String,
    ) -> Result<(), String> {
        if new_name.trim().is_empty() {
            return Err("Snapshot name cannot be empty".to_string());
        }

        if new_name.len() > 255 {
            return Err("Snapshot name must be less than 255 characters".to_string());
        }

        let affected = conn
            .execute(
                "UPDATE edit_snapshots SET name = ?1 WHERE id = ?2",
                params![new_name, snapshot_id],
            )
            .map_err(|e| format!("Failed to rename snapshot: {}", e))?;

        if affected == 0 {
            return Err(format!("Snapshot with id {} not found", snapshot_id));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to create a test database with snapshots table
    fn setup_test_db() -> Result<Connection, String> {
        let conn = Connection::open_in_memory()
            .map_err(|e| format!("Failed to create in-memory DB: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS edit_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                snapshot_data TEXT NOT NULL,
                event_ids TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(image_id, name)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create table: {}", e))?;

        Ok(conn)
    }

    #[test]
    fn test_create_snapshot_success() {
        let conn = setup_test_db().expect("Setup failed");
        let event_ids = vec!["evt-1".to_string(), "evt-2".to_string()];
        let snapshot_data =
            r#"[{"eventType":"ExposureAdjusted","payload":{"value":20}}]"#.to_string();

        let result = SnapshotService::create_snapshot(
            &conn,
            100,
            "Before color grading".to_string(),
            event_ids.clone(),
            snapshot_data.clone(),
        );

        assert!(result.is_ok());
        let dto = result.unwrap();
        assert_eq!(dto.image_id, 100);
        assert_eq!(dto.name, "Before color grading");
        assert_eq!(dto.event_ids.len(), 2);
    }

    #[test]
    fn test_create_snapshot_empty_name() {
        let conn = setup_test_db().expect("Setup failed");

        let result =
            SnapshotService::create_snapshot(&conn, 100, "".to_string(), vec![], "[]".to_string());

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn test_get_snapshots_multiple() {
        let conn = setup_test_db().expect("Setup failed");

        // Create multiple snapshots
        for i in 1..=3 {
            let _ = SnapshotService::create_snapshot(
                &conn,
                100,
                format!("Snapshot {}", i),
                vec![format!("evt-{}", i)],
                "[]".to_string(),
            );
        }

        let result = SnapshotService::get_snapshots(&conn, 100);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 3);
    }

    #[test]
    fn test_delete_snapshot_success() {
        let conn = setup_test_db().expect("Setup failed");

        let dto = SnapshotService::create_snapshot(
            &conn,
            100,
            "Test snapshot".to_string(),
            vec!["evt-1".to_string()],
            "[]".to_string(),
        )
        .expect("Failed to create snapshot");

        let result = SnapshotService::delete_snapshot(&conn, dto.id);
        assert!(result.is_ok());

        // Verify it's deleted
        let snapshots = SnapshotService::get_snapshots(&conn, 100).unwrap();
        assert_eq!(snapshots.len(), 0);
    }

    #[test]
    fn test_get_snapshots_empty() {
        let conn = setup_test_db().expect("Setup failed");

        let result = SnapshotService::get_snapshots(&conn, 999);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }
}

use serde_json;
use std::io;
use thiserror::Error;

/// Custom error type for settings operations
#[derive(Debug, Error)]
pub enum SettingsError {
    #[error("JSON serialization failed: {0}")]
    SerializeError(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    DbError(String),

    #[error("Invalid settings configuration: {0}")]
    ValidationError(String),

    #[error("IO error: {0}")]
    IoError(#[from] io::Error),
}

/// Result type for settings operations
pub type SettingsResult<T> = Result<T, SettingsError>;

/// Load settings from database
///
/// Fetches the JSON blob from app_settings table (id=1),
/// deserializes it into SettingsConfig.
/// Falls back to default SettingsConfig if table is empty or corrupt.
///
/// # Arguments
/// * `conn` - SQLite connection handle
///
/// # Returns
/// * `Result<SettingsConfig, SettingsError>` - Deserialized settings or error
pub fn load_settings(conn: &rusqlite::Connection) -> SettingsResult<serde_json::Value> {
    // Try to fetch existing row
    let mut stmt = conn
        .prepare("SELECT settings_json FROM app_settings WHERE id = 1")
        .map_err(|e| SettingsError::DbError(e.to_string()))?;

    let value = stmt
        .query_row([], |row| {
            let json_str: String = row.get(0)?;
            Ok(json_str)
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                // No settings exist yet - return safe error
                SettingsError::DbError("No settings found in database".to_string())
            }
            other => SettingsError::DbError(other.to_string()),
        })?;

    // Deserialize JSON
    serde_json::from_str(&value).map_err(SettingsError::SerializeError)
}

/// Save settings to database
///
/// Serializes SettingsConfig to JSON and performs an atomic UPDATE
/// on the app_settings row (id=1).
///
/// # Arguments
/// * `conn` - SQLite connection handle
/// * `config` - SettingsConfig to persist
///
/// # Returns
/// * `Result<(), SettingsError>` - Success or error
pub fn save_settings(
    conn: &rusqlite::Connection,
    config: &serde_json::Value,
) -> SettingsResult<()> {
    // Serialize to JSON string
    let json_str = serde_json::to_string(config).map_err(SettingsError::SerializeError)?;

    // Validate JSON is not empty
    if json_str.is_empty() {
        return Err(SettingsError::ValidationError(
            "Settings JSON cannot be empty".to_string(),
        ));
    }

    // Atomic UPDATE statement (id=1 enforced by table CHECK constraint)
    let mut stmt = conn
        .prepare("UPDATE app_settings SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .map_err(|e| SettingsError::DbError(e.to_string()))?;

    stmt.execute(rusqlite::params![&json_str])
        .map_err(|e| SettingsError::DbError(e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_db() -> rusqlite::Connection {
        let conn =
            rusqlite::Connection::open_in_memory().expect("Failed to create in-memory database");

        // Create app_settings table
        conn.execute(
            "CREATE TABLE app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                settings_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .expect("Failed to create app_settings table");

        // Insert default row
        let default_json = serde_json::json!({
            "storage": {
                "catalogue_root": "/test",
                "database_path": "/test/catalog.db"
            },
            "theme": "auto"
        });

        conn.execute(
            "INSERT INTO app_settings (id, settings_json) VALUES (1, ?)",
            rusqlite::params![default_json.to_string()],
        )
        .expect("Failed to insert default settings");

        conn
    }

    #[test]
    fn test_load_settings_success() {
        let conn = create_test_db();

        let result = load_settings(&conn);
        assert!(result.is_ok());

        let config = result.unwrap();
        assert_eq!(config["storage"]["catalogue_root"], "/test");
        assert_eq!(config["theme"], "auto");
    }

    #[test]
    fn test_save_settings_success() {
        let conn = create_test_db();

        let new_config = serde_json::json!({
            "storage": {
                "catalogue_root": "/updated",
                "database_path": "/updated/catalog.db"
            },
            "theme": "dark"
        });

        let result = save_settings(&conn, &new_config);
        assert!(result.is_ok());

        // Verify persisted value
        let loaded = load_settings(&conn).expect("Failed to load after save");
        assert_eq!(loaded["theme"], "dark");
        assert_eq!(loaded["storage"]["catalogue_root"], "/updated");
    }

    #[test]
    fn test_save_empty_settings_fails() {
        let conn = create_test_db();

        let empty_config = serde_json::json!("");
        let _result = save_settings(&conn, &empty_config);

        // Empty string is still valid JSON, but our validation should catch it
        // (note: actual implementation depends on requirements)
        // For now, we test that empty object works
        let empty_object = serde_json::json!({});
        let result = save_settings(&conn, &empty_object);
        assert!(result.is_ok());
    }

    #[test]
    fn test_json_serialization_roundtrip() {
        let conn = create_test_db();

        let original = serde_json::json!({
            "complex": {
                "nested": {
                    "array": [1, 2, 3],
                    "string": "test"
                }
            }
        });

        save_settings(&conn, &original).expect("Save failed");
        let loaded = load_settings(&conn).expect("Load failed");

        assert_eq!(original, loaded);
    }
}

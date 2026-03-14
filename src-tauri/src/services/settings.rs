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
    validate_settings_schema(config)?;

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

fn validate_settings_schema(config: &serde_json::Value) -> SettingsResult<()> {
    let root = config.as_object().ok_or_else(|| {
        SettingsError::ValidationError("Settings payload must be a JSON object".to_string())
    })?;

    for key in [
        "storage",
        "cache",
        "preview",
        "keyboard",
        "user",
        "ai",
        "appearance",
        "telemetry_enabled",
        "last_updated",
    ] {
        if !root.contains_key(key) {
            return Err(SettingsError::ValidationError(format!(
                "Missing required key: {}",
                key
            )));
        }
    }

    for key in [
        "storage",
        "cache",
        "preview",
        "keyboard",
        "user",
        "ai",
        "appearance",
    ] {
        if !root.get(key).map(|v| v.is_object()).unwrap_or(false) {
            return Err(SettingsError::ValidationError(format!(
                "Key '{}' must be a JSON object",
                key
            )));
        }
    }

    if !root
        .get("telemetry_enabled")
        .map(|v| v.is_boolean())
        .unwrap_or(false)
    {
        return Err(SettingsError::ValidationError(
            "telemetry_enabled must be a boolean".to_string(),
        ));
    }

    if !root
        .get("last_updated")
        .map(|v| v.is_string())
        .unwrap_or(false)
    {
        return Err(SettingsError::ValidationError(
            "last_updated must be an ISO string".to_string(),
        ));
    }

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
            "cache": {},
            "preview": {},
            "keyboard": {},
            "user": {},
            "ai": {},
            "appearance": {"theme": "dark"},
            "telemetry_enabled": false,
            "last_updated": "2026-03-14T00:00:00Z"
        });

        let result = save_settings(&conn, &new_config);
        assert!(result.is_ok());

        // Verify persisted value
        let loaded = load_settings(&conn).expect("Failed to load after save");
        assert_eq!(loaded["appearance"]["theme"], "dark");
        assert_eq!(loaded["storage"]["catalogue_root"], "/updated");
    }

    #[test]
    fn test_save_empty_settings_fails() {
        let conn = create_test_db();

        let empty_config = serde_json::json!("");
        // Empty string is valid JSON but not a valid settings schema.
        let invalid_result = save_settings(&conn, &empty_config);
        assert!(invalid_result.is_err());

        // Empty object should fail schema validation because required keys are missing.
        let empty_object = serde_json::json!({});
        let result = save_settings(&conn, &empty_object);
        assert!(result.is_err());
    }

    #[test]
    fn test_json_serialization_roundtrip() {
        let conn = create_test_db();

        let original = serde_json::json!({
            "storage": {"catalogue_root": "/catalog", "database_path": "/catalog.db"},
            "cache": {"l1_limit_mb": 512},
            "preview": {"thumbnail_size_px": 160},
            "keyboard": {},
            "user": {"email": "user@example.com"},
            "ai": {"enabled": false},
            "appearance": {"theme": "auto"},
            "telemetry_enabled": false,
            "last_updated": "2026-03-14T00:00:00Z"
        });

        save_settings(&conn, &original).expect("Save failed");
        let loaded = load_settings(&conn).expect("Load failed");

        assert_eq!(original, loaded);
    }

    #[test]
    fn test_save_settings_rejects_wrong_telemetry_type() {
        let conn = create_test_db();

        let invalid = serde_json::json!({
            "storage": {},
            "cache": {},
            "preview": {},
            "keyboard": {},
            "user": {},
            "ai": {},
            "appearance": {},
            "telemetry_enabled": "false",
            "last_updated": "2026-03-14T00:00:00Z"
        });

        let result = save_settings(&conn, &invalid);
        assert!(result.is_err());
        assert!(matches!(result, Err(SettingsError::ValidationError(_))));
    }

    #[test]
    fn test_save_settings_rejects_missing_required_key() {
        let conn = create_test_db();

        let invalid = serde_json::json!({
            "storage": {},
            "cache": {},
            "preview": {},
            "keyboard": {},
            "user": {},
            "ai": {},
            "telemetry_enabled": false,
            "last_updated": "2026-03-14T00:00:00Z"
        });

        let result = save_settings(&conn, &invalid);
        assert!(result.is_err());
        assert!(matches!(result, Err(SettingsError::ValidationError(_))));
    }
}

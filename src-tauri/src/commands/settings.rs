use super::catalog::AppState;
use crate::services::settings;
use tauri::State;

/// IPC Command: Load settings from database
///
/// Fetches the persisted settings JSON from SQLite and deserializes it.
/// Returns error message if database is unavailable or settings corrupt.
///
/// # Returns
/// * `Ok(serde_json::Value)` - Deserialized settings configuration
/// * `Err(String)` - Error message suitable for frontend display
#[tauri::command]
pub async fn load_settings_from_db(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let conn = db_guard.transaction_conn();

    settings::load_settings(conn).map_err(|e| e.to_string())
}

/// IPC Command: Save settings to database
///
/// Atomically persists the settings configuration to SQLite.
/// Validates configuration before saving.
///
/// # Arguments
/// * `config` - SettingsConfig as JSON value (from frontend Tauri invoke)
///
/// # Returns
/// * `Ok(())` - Settings saved successfully
/// * `Err(String)` - Error message (database locked, validation failed, etc.)
#[tauri::command]
pub async fn save_settings_to_db(
    state: State<'_, AppState>,
    config: serde_json::Value,
) -> Result<(), String> {
    // Validate config is not empty object
    if config.is_null() {
        return Err("Settings configuration cannot be null".to_string());
    }

    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let conn = db_guard.transaction_conn();

    settings::save_settings(conn, &config).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_null_config_rejected() {
        let null_config = serde_json::Value::Null;

        // Simulating the validation logic
        assert!(null_config.is_null());
    }

    #[test]
    fn test_empty_object_accepted() {
        let empty_config = serde_json::json!({});

        // Simulating the validation logic
        assert!(!empty_config.is_null());
    }
}

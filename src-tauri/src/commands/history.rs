use crate::commands::catalog::AppState;
use crate::models::edit::EditStateDTO;
use crate::services::history_service::{HistoryService, SnapshotDTO};
use tauri::State;

/// Retourne la timeline des N derniers événements d'édition d'une image
#[tauri::command]
pub async fn get_event_timeline(
    state: State<'_, AppState>,
    image_id: i64,
    limit: Option<i64>,
) -> Result<Vec<crate::models::edit::EditEventDTO>, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::get_event_timeline(&mut db, image_id, limit).map_err(|e| e.to_string())
}

/// Crée un snapshot nommé de l'état courant
#[tauri::command]
pub async fn create_snapshot(
    state: State<'_, AppState>,
    image_id: i64,
    name: String,
    description: Option<String>,
) -> Result<SnapshotDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::create_snapshot(&mut db, image_id, name, description).map_err(|e| e.to_string())
}

/// Retourne tous les snapshots d'une image
#[tauri::command]
pub async fn get_snapshots(
    state: State<'_, AppState>,
    image_id: i64,
) -> Result<Vec<SnapshotDTO>, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::get_snapshots(&mut db, image_id).map_err(|e| e.to_string())
}

/// Restaure l'état à un événement spécifique
#[tauri::command]
pub async fn restore_to_event(
    state: State<'_, AppState>,
    image_id: i64,
    event_id: i64,
) -> Result<EditStateDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::restore_to_event(&mut db, image_id, event_id).map_err(|e| e.to_string())
}

/// Restaure l'état à un snapshot
#[tauri::command]
pub async fn restore_to_snapshot(
    state: State<'_, AppState>,
    snapshot_id: i64,
) -> Result<EditStateDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::restore_to_snapshot(&mut db, snapshot_id).map_err(|e| e.to_string())
}

/// Supprime un snapshot
#[tauri::command]
pub async fn delete_snapshot(state: State<'_, AppState>, snapshot_id: i64) -> Result<(), String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::delete_snapshot(&mut db, snapshot_id).map_err(|e| e.to_string())
}

/// Compte les événements actifs depuis l'import
#[tauri::command]
pub async fn count_events_since_import(
    state: State<'_, AppState>,
    image_id: i64,
) -> Result<i64, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    HistoryService::count_events_since_import(&mut db, image_id).map_err(|e| e.to_string())
}

use crate::commands::catalog::AppState;
use crate::models::dto::CommandResult;
use crate::models::snapshot::SnapshotDTO;
use crate::services::snapshot_service::SnapshotService;
use tauri::State;

/// Create a new snapshot for an image
///
/// # Arguments
///
/// * `image_id` - ID of the image being edited
/// * `name` - User-provided name for the snapshot
/// * `event_ids` - Vector of event IDs that comprise this snapshot
/// * `snapshot_data` - JSON string containing serialized events
#[tauri::command]
pub fn create_snapshot(
    image_id: i64,
    name: String,
    event_ids: Vec<String>,
    snapshot_data: String,
    state: State<AppState>,
) -> CommandResult<SnapshotDTO> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("DB lock failed: {}", e))?;

    let conn = db_guard.transaction_conn();
    SnapshotService::create_snapshot(conn, image_id, name, event_ids, snapshot_data)
}

/// Get all snapshots for a specific image
///
/// # Arguments
///
/// * `image_id` - ID of the image
#[tauri::command]
pub fn get_snapshots(image_id: i64, state: State<AppState>) -> CommandResult<Vec<SnapshotDTO>> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("DB lock failed: {}", e))?;

    let conn = db_guard.transaction_conn();
    SnapshotService::get_snapshots(conn, image_id)
}

/// Get a single snapshot by ID
///
/// # Arguments
///
/// * `snapshot_id` - ID of the snapshot
#[tauri::command]
pub fn get_snapshot(
    snapshot_id: i64,
    state: State<AppState>,
) -> CommandResult<Option<SnapshotDTO>> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("DB lock failed: {}", e))?;

    let conn = db_guard.transaction_conn();
    SnapshotService::get_snapshot(conn, snapshot_id)
}

/// Delete a snapshot by ID
///
/// # Arguments
///
/// * `snapshot_id` - ID of the snapshot to delete
#[tauri::command]
pub fn delete_snapshot(snapshot_id: i64, state: State<AppState>) -> CommandResult<()> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("DB lock failed: {}", e))?;

    let conn = db_guard.transaction_conn();
    SnapshotService::delete_snapshot(conn, snapshot_id)
}

/// Rename a snapshot
///
/// # Arguments
///
/// * `snapshot_id` - ID of the snapshot
/// * `new_name` - New name for the snapshot
#[tauri::command]
pub fn rename_snapshot(
    snapshot_id: i64,
    new_name: String,
    state: State<AppState>,
) -> CommandResult<()> {
    let mut db_guard = state
        .db
        .lock()
        .map_err(|e| format!("DB lock failed: {}", e))?;

    let conn = db_guard.transaction_conn();
    SnapshotService::rename_snapshot(conn, snapshot_id, new_name)
}

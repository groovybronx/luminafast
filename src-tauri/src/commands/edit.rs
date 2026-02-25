use crate::commands::catalog::AppState;
use crate::models::edit::{EditEventDTO, EditStateDTO};
use crate::services::edit_sourcing::EditSourcingService;
use tauri::State;

/// Applique un événement d'édition à une image et retourne l'état courant.
///
/// # Arguments
/// - `image_id`    : ID de l'image dans le catalogue
/// - `event_type`  : Type d'événement (ex: "EXPOSURE", "CONTRAST")
/// - `payload_json`: JSON stringifié { "param": "exposure", "value": 0.5 }
#[tauri::command]
pub async fn apply_edit(
    state: State<'_, AppState>,
    image_id: i64,
    event_type: String,
    payload_json: String,
) -> Result<EditStateDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    EditSourcingService::apply_edit_event(&mut db, image_id, &event_type, &payload_json, None)
}

/// Retourne l'historique des N derniers events d'édition pour une image.
#[tauri::command]
pub async fn get_edit_history(
    state: State<'_, AppState>,
    image_id: i64,
) -> Result<Vec<EditEventDTO>, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    EditSourcingService::get_edit_history(&mut db, image_id, Some(50))
}

/// Retourne l'état courant d'édition d'une image (depuis snapshot ou replay complet).
#[tauri::command]
pub async fn get_current_edit_state(
    state: State<'_, AppState>,
    image_id: i64,
) -> Result<EditStateDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    EditSourcingService::get_current_edit_state(&mut db, image_id)
}

/// Annule le dernier événement d'édition (soft-undo) et retourne le nouvel état.
#[tauri::command]
pub async fn undo_edit(state: State<'_, AppState>, image_id: i64) -> Result<EditStateDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    EditSourcingService::undo_last_edit(&mut db, image_id)
}

/// Refait un événement précédemment annulé et retourne le nouvel état.
///
/// # Arguments
/// - `event_id`: ID de l'événement à refaire (obtenu depuis get_edit_history)
#[tauri::command]
pub async fn redo_edit(
    state: State<'_, AppState>,
    image_id: i64,
    event_id: i64,
) -> Result<EditStateDTO, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    EditSourcingService::redo_edit(&mut db, image_id, event_id)
}

/// Supprime tous les événements d'édition d'une image (reset complet).
#[tauri::command]
pub async fn reset_edits(state: State<'_, AppState>, image_id: i64) -> Result<(), String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    EditSourcingService::reset_edits(&mut db, image_id)
}

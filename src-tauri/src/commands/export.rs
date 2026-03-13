use crate::commands::catalog::AppState;
use crate::models::dto::{CommandResult, ExportResultDTO};
use crate::services::export_pipeline::{
    export_image_with_edits, export_raw_image_with_edits, ExportFormat, ExportRequest,
};
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub async fn export_image_edited(
    image_id: String,
    output_path: String,
    format: String,
    state: State<'_, AppState>,
) -> CommandResult<ExportResultDTO> {
    run_export_command(image_id, output_path, format, state, false)
}

#[tauri::command]
pub async fn export_raw_edited(
    image_id: String,
    output_path: String,
    format: String,
    state: State<'_, AppState>,
) -> CommandResult<ExportResultDTO> {
    run_export_command(image_id, output_path, format, state, true)
}

fn run_export_command(
    image_id: String,
    output_path: String,
    format: String,
    state: State<'_, AppState>,
    raw_only: bool,
) -> CommandResult<ExportResultDTO> {
    let parsed_image_id = image_id
        .parse::<i64>()
        .map_err(|e| format!("Invalid image_id '{}': {}", image_id, e))?;

    let export_format = ExportFormat::try_from(format.as_str()).map_err(|e| e.to_string())?;

    let request = ExportRequest {
        image_id: parsed_image_id,
        output_path: PathBuf::from(output_path),
        format: export_format,
    };

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let result = if raw_only {
        export_raw_image_with_edits(db.connection(), &request).map_err(|e| e.to_string())?
    } else {
        export_image_with_edits(db.connection(), &request).map_err(|e| e.to_string())?
    };

    Ok(ExportResultDTO {
        image_id: result.image_id,
        output_path: result.output_path,
        format: result.format,
        width: result.width,
        height: result.height,
        applied_edit_events: result.applied_edit_events,
        used_snapshot: result.used_snapshot,
    })
}

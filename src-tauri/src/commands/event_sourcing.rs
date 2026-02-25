use crate::commands::catalog::AppState;
use crate::models::event::Event;
use crate::services::event_sourcing::{EventStore, EventStoreError};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDTO {
    pub id: String,
    pub timestamp: i64,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub target_type: String,
    pub target_id: i64,
    pub user_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<EventStoreError> for CommandError {
    fn from(err: EventStoreError) -> Self {
        CommandError {
            message: err.to_string(),
        }
    }
}

#[tauri::command]
pub fn append_event(event: EventDTO, state: State<AppState>) -> Result<(), CommandError> {
    let mut db_guard = state.db.lock().map_err(|e| CommandError {
        message: format!("DB lock: {}", e),
    })?;
    let conn = db_guard.connection();

    // Convert DTO to Event
    let event_to_store =
        Event {
            id: event.id,
            timestamp: event.timestamp,
            event_type: serde_json::from_value(serde_json::Value::String(event.event_type))
                .map_err(|e| CommandError {
                    message: format!("Invalid event_type: {}", e),
                })?,
            payload: serde_json::from_value(event.payload).map_err(|e| CommandError {
                message: format!("Invalid payload: {}", e),
            })?,
            target_type: serde_json::from_value(serde_json::Value::String(event.target_type))
                .map_err(|e| CommandError {
                    message: format!("Invalid target_type: {}", e),
                })?,
            target_id: event.target_id,
            user_id: event.user_id,
            created_at: chrono::DateTime::parse_from_rfc3339(&event.created_at)
                .map_err(|e| CommandError {
                    message: format!("Invalid created_at: {}", e),
                })?
                .with_timezone(&chrono::Utc),
        };

    let store = EventStore::new(conn);
    store
        .append_event(&event_to_store)
        .map_err(CommandError::from)?;
    Ok(())
}

#[tauri::command]
pub fn get_events(state: State<AppState>) -> Result<Vec<EventDTO>, CommandError> {
    let mut db_guard = state.db.lock().map_err(|e| CommandError {
        message: format!("DB lock: {}", e),
    })?;
    let conn = db_guard.connection();
    let store = EventStore::new(conn);
    let events = store.get_events().map_err(CommandError::from)?;

    let dtos = events
        .into_iter()
        .map(|e| {
            let payload = serde_json::to_value(&e.payload).unwrap_or(serde_json::Value::Null);
            EventDTO {
                id: e.id,
                timestamp: e.timestamp,
                event_type: format!("{:?}", e.event_type),
                payload,
                target_type: format!("{:?}", e.target_type),
                target_id: e.target_id,
                user_id: e.user_id,
                created_at: e.created_at.to_rfc3339(),
            }
        })
        .collect();
    Ok(dtos)
}

#[tauri::command]
pub fn replay_events(state: State<AppState>) -> Result<(), CommandError> {
    let mut db_guard = state.db.lock().map_err(|e| CommandError {
        message: format!("DB lock: {}", e),
    })?;
    let conn = db_guard.connection();
    let store = EventStore::new(conn);
    let events = store.get_events().map_err(CommandError::from)?;
    // TODO: Appliquer chaque événement au modèle (idempotent)
    for _event in events {
        // ... logique de replay à implémenter ...
    }
    Ok(())
}

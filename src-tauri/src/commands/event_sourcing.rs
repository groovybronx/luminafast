use crate::cache::CacheInstance;
use crate::commands::catalog::AppState;
use crate::models::event::Event;
use crate::services::event_sourcing::{EventStore, EventStoreError};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
pub async fn append_event(
    event: EventDTO,
    state: State<'_, AppState>,
    cache: State<'_, CacheInstance>,
) -> Result<(), CommandError> {
    // Store event in DB (sync part)
    let target_id = event.target_id;
    {
        let mut db_guard = state.db.lock().map_err(|e| CommandError {
            message: format!("DB lock: {}", e),
        })?;
        let conn = db_guard.connection();

        // Convert DTO to Event
        let event_to_store = Event {
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
    } // Lock released here

    // Phase 6.1.3 — Invalidate cache on edit (async part)
    if let Err(e) = cache.invalidate_image(target_id as u32).await {
        log::warn!(
            "[EventSourcing] Failed to invalidate cache for image_id={}: {}",
            target_id,
            e
        );
        // Non-blocking: don't fail the event append if cache invalidation fails
    }

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
pub fn get_edit_events(
    image_id: i64,
    state: State<AppState>,
) -> Result<Vec<EventDTO>, CommandError> {
    let mut db_guard = state.db.lock().map_err(|e| CommandError {
        message: format!("DB lock: {}", e),
    })?;
    let conn = db_guard.connection();
    let store = EventStore::new(conn);
    let all_events = store.get_events().map_err(CommandError::from)?;

    // Filter events for the specific image_id
    let filtered_events: Vec<_> = all_events
        .into_iter()
        .filter(|e| e.target_id == image_id)
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

    if cfg!(debug_assertions) {
        eprintln!(
            "[EventSourcing] get_edit_events called for image_id={}, returned {} events",
            image_id,
            filtered_events.len()
        );
    }

    Ok(filtered_events)
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

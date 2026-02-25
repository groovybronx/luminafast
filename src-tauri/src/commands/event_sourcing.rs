use tauri::State;
use crate::services::event_sourcing::EventStore;
use crate::models::event::Event;
use serde::{Deserialize, Serialize};
use crate::commands::catalog::AppState;

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

#[tauri::command]
pub fn append_event(event: EventDTO, state: State<AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| format!("DB lock: {}", e))?;
    let conn = db_guard.connection();
    let event: Event = serde_json::from_value(serde_json::to_value(event).unwrap())
        .map_err(|e| format!("Invalid event: {}", e))?;
    let store = EventStore::new(conn);
    store.append_event(&event).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_events(state: State<AppState>) -> Result<Vec<EventDTO>, String> {
    let mut db_guard = state.db.lock().map_err(|e| format!("DB lock: {}", e))?;
    let conn = db_guard.connection();
    let store = EventStore::new(conn);
    let events = store.get_events().map_err(|e| e.to_string())?;
    let dtos = events.into_iter().map(|e| {
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
    }).collect();
    Ok(dtos)
}

#[tauri::command]
pub fn replay_events(state: State<AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| format!("DB lock: {}", e))?;
    let conn = db_guard.connection();
    let store = EventStore::new(conn);
    let events = store.get_events().map_err(|e| e.to_string())?;
    // TODO: Appliquer chaque événement au modèle (idempotent)
    for _event in events {
        // ... logique de replay à implémenter ...
    }
    Ok(())
}

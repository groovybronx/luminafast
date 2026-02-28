use crate::commands::catalog::AppState;
use crate::models::event::{
    EditAppliedPayload, Event, EventPayload, EventType, ImageEditedPayload, TargetType,
};
use crate::services::event_sourcing::{EventStore, EventStoreError};
use serde::{Deserialize, Serialize};
use serde_json::Value;
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

fn to_snake_case(value: &str) -> String {
    let mut result = String::new();
    for (idx, ch) in value.chars().enumerate() {
        if ch.is_uppercase() {
            if idx != 0 {
                result.push('_');
            }
            for lower in ch.to_lowercase() {
                result.push(lower);
            }
        } else {
            result.push(ch);
        }
    }
    result
}

fn parse_event_type(raw: &str) -> Result<EventType, CommandError> {
    if let Ok(parsed) = serde_json::from_value::<EventType>(Value::String(raw.to_string())) {
        return Ok(parsed);
    }

    let normalized = to_snake_case(raw);
    serde_json::from_value::<EventType>(Value::String(normalized)).map_err(|e| CommandError {
        message: format!("Invalid event_type: {}", e),
    })
}

fn parse_target_type(raw: &str) -> Result<TargetType, CommandError> {
    if let Ok(parsed) = serde_json::from_value::<TargetType>(Value::String(raw.to_string())) {
        return Ok(parsed);
    }

    serde_json::from_value::<TargetType>(Value::String(raw.to_lowercase())).map_err(|e| {
        CommandError {
            message: format!("Invalid target_type: {}", e),
        }
    })
}

fn parse_image_edits(payload: &Value, target_id: i64) -> Result<ImageEditedPayload, CommandError> {
    let payload_object = payload.as_object().ok_or(CommandError {
        message: "Invalid payload for ImageEdited: expected object".to_string(),
    })?;

    let image_id = payload_object
        .get("image_id")
        .and_then(Value::as_i64)
        .unwrap_or(target_id);

    let edits_value = payload_object
        .get("edits")
        .cloned()
        .unwrap_or_else(|| Value::Object(serde_json::Map::new()));

    let edits = edits_value.as_object().cloned().ok_or(CommandError {
        message: "Invalid payload.edits for ImageEdited: expected object".to_string(),
    })?;

    Ok(ImageEditedPayload { image_id, edits })
}

fn parse_payload(
    payload: &Value,
    event_type: &EventType,
    target_id: i64,
) -> Result<EventPayload, CommandError> {
    if matches!(event_type, EventType::ImageEdited) {
        return Ok(EventPayload::ImageEdited(parse_image_edits(
            payload, target_id,
        )?));
    }

    serde_json::from_value::<EventPayload>(payload.clone()).map_err(|e| CommandError {
        message: format!("Invalid payload: {}", e),
    })
}

fn event_to_dto(event: Event) -> Result<EventDTO, CommandError> {
    let payload = serde_json::to_value(&event.payload).map_err(|e| CommandError {
        message: format!("Invalid payload: {}", e),
    })?;

    Ok(EventDTO {
        id: event.id,
        timestamp: event.timestamp,
        event_type: format!("{:?}", event.event_type),
        payload,
        target_type: format!("{:?}", event.target_type),
        target_id: event.target_id,
        user_id: event.user_id,
        created_at: event.created_at.to_rfc3339(),
    })
}

fn edit_payload_to_dto(
    event: Event,
    edit_payload: EditAppliedPayload,
) -> Result<EventDTO, CommandError> {
    let mut edits = serde_json::Map::new();
    edits.insert(edit_payload.edit_type, edit_payload.new_value);

    let payload = serde_json::to_value(ImageEditedPayload {
        image_id: event.target_id,
        edits,
    })
    .map_err(|e| CommandError {
        message: format!("Invalid payload: {}", e),
    })?;

    Ok(EventDTO {
        id: event.id,
        timestamp: event.timestamp,
        event_type: "ImageEdited".to_string(),
        payload,
        target_type: format!("{:?}", event.target_type),
        target_id: event.target_id,
        user_id: event.user_id,
        created_at: event.created_at.to_rfc3339(),
    })
}

#[tauri::command]
pub fn append_event(event: EventDTO, state: State<AppState>) -> Result<(), CommandError> {
    let mut db_guard = state.db.lock().map_err(|e| CommandError {
        message: format!("DB lock: {}", e),
    })?;
    let conn = db_guard.connection();

    let event_type = parse_event_type(&event.event_type)?;
    let target_type = parse_target_type(&event.target_type)?;
    let payload = parse_payload(&event.payload, &event_type, event.target_id)?;

    // Convert DTO to Event
    let event_to_store = Event {
        id: event.id,
        timestamp: event.timestamp,
        event_type,
        payload,
        target_type,
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

    let mut dtos = Vec::new();
    for event in events {
        dtos.push(event_to_dto(event)?);
    }
    Ok(dtos)
}

#[tauri::command]
pub fn get_edit_events(
    image_id: i64,
    state: State<AppState>,
) -> Result<Vec<EventDTO>, CommandError> {
    if image_id <= 0 {
        return Err(CommandError {
            message: "Invalid image_id: must be > 0".to_string(),
        });
    }

    let mut db_guard = state.db.lock().map_err(|e| CommandError {
        message: format!("DB lock: {}", e),
    })?;
    let conn = db_guard.connection();
    let store = EventStore::new(conn);
    let events = store
        .get_events_for_target(TargetType::Image, image_id)
        .map_err(CommandError::from)?;

    let mut dtos = Vec::new();
    for event in events {
        let event_type = event.event_type.clone();
        match event_type {
            EventType::ImageEdited => {
                dtos.push(event_to_dto(event)?);
            }
            EventType::EditApplied => {
                if let EventPayload::EditApplied(payload) = event.payload.clone() {
                    dtos.push(edit_payload_to_dto(event, payload)?);
                }
            }
            _ => {}
        }
    }

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

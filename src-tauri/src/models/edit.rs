use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Raw edit event as stored in DB (used in service layer for DB queries)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct EditEvent {
    pub id: i64,
    pub image_id: i64,
    pub event_type: String,
    pub payload: serde_json::Value, // JSON: { "param": "exposure", "value": 0.75 }
    pub is_undone: bool,
    pub session_id: Option<String>,
    pub created_at: String,
}

/// Snapshot of computed edit state for a given image (performance optimization)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct EditSnapshot {
    pub image_id: i64,
    pub snapshot: serde_json::Value, // Map<param, value>
    pub event_count: i64,
    pub updated_at: String,
}

/// DTO exposé au frontend : état courant de l'édition d'une image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditStateDTO {
    pub image_id: i64,
    pub state: HashMap<String, f64>, // { "exposure": 0.5, "contrast": -0.2, ... }
    pub can_undo: bool,
    pub can_redo: bool,
    pub event_count: i64,
}

/// DTO exposé au frontend : un événement d'édition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditEventDTO {
    pub id: i64,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub is_undone: bool,
    pub created_at: String,
}

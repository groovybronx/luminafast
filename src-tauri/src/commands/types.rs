use serde::{Deserialize, Serialize};

/// Simplified image type for Tauri commands
/// Note: Prévu pour Phase 4.2+ (image rendering pipeline avec historique)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct TauriImage {
    pub id: i64,
    pub filename: String,
    pub filepath: String,
    pub file_hash: String,
    pub file_size: i64,
    pub captured_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub exif_data: Option<serde_json::Value>,
    pub rating: i32,
    pub flag: Option<String>,
    pub color_label: Option<String>,
    pub edit_data: Option<serde_json::Value>,
    pub edit_version: i32,
    pub is_synced: bool,
    pub sync_revision: Option<String>,
}

/// Simplified collection type for Tauri commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TauriCollection {
    pub id: i64,
    pub name: String,
    pub collection_type: String,
    pub parent_id: Option<i64>,
    pub query: Option<serde_json::Value>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// New image for insertion
/// Note: Prévu pour Phase 4.2+ (création d'images via API complète Tauri)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct TauriNewImage {
    pub filename: String,
    pub filepath: String,
    pub file_hash: String,
    pub file_size: i64,
    pub captured_at: Option<String>,
    pub exif_data: Option<serde_json::Value>,
}

/// Image update payload
/// Note: Prévu pour Phase 4.2+ (pipeline de rendu image) et Phase 5+ (édition/tagging)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct TauriImageUpdate {
    pub rating: Option<i32>,
    pub flag: Option<Option<String>>,
    pub color_label: Option<Option<String>>,
    pub edit_data: Option<serde_json::Value>,
    pub is_synced: Option<bool>,
    pub sync_revision: Option<Option<String>>,
}

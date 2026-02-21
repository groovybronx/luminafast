#![allow(dead_code)] // Modèles planifiés pour les phases 2+ non encore utilisés

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Image model matching the database schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    pub id: i64,
    pub blake3_hash: String,
    pub filename: String,
    pub extension: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub orientation: i32,
    pub file_size_bytes: Option<i64>,
    pub captured_at: Option<DateTime<Utc>>,
    pub imported_at: DateTime<Utc>,
    pub folder_id: Option<i64>,
}

/// Folder model for directory structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: i64,
    pub path: String,
    pub volume_name: Option<String>,
    pub parent_id: Option<i64>,
}

/// EXIF metadata model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExifMetadata {
    pub image_id: i64,
    pub iso: Option<i32>,
    pub aperture: Option<f64>,
    pub shutter_speed: Option<f64>, // log2(seconds)
    pub focal_length: Option<f64>,
    pub lens: Option<String>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub gps_lat: Option<f64>,
    pub gps_lon: Option<f64>,
    pub color_space: Option<String>,
}

/// Collection model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub collection_type: CollectionType,
    pub parent_id: Option<i64>,
    pub smart_query: Option<String>, // JSON
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CollectionType {
    Static,
    Smart,
    Quick,
}

/// Collection-Image relationship
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionImage {
    pub collection_id: i64,
    pub image_id: i64,
    pub sort_order: i32,
}

/// Image state (rating, flags, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageState {
    pub image_id: i64,
    pub rating: i32,
    pub flag: Option<ImageFlag>,
    pub color_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ImageFlag {
    Pick,
    Reject,
}

/// Tag model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
}

/// Image-Tag relationship
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageTag {
    pub image_id: i64,
    pub tag_id: i64,
}

/// New image for insertion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewImage {
    pub blake3_hash: String,
    pub filename: String,
    pub extension: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub orientation: i32,
    pub file_size_bytes: Option<i64>,
    pub captured_at: Option<DateTime<Utc>>,
    pub folder_id: Option<i64>,
}

/// New folder for insertion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewFolder {
    pub path: String,
    pub volume_name: Option<String>,
    pub parent_id: Option<i64>,
}

/// New EXIF metadata for insertion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewExifMetadata {
    pub image_id: i64,
    pub iso: Option<i32>,
    pub aperture: Option<f64>,
    pub shutter_speed: Option<f64>,
    pub focal_length: Option<f64>,
    pub lens: Option<String>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub gps_lat: Option<f64>,
    pub gps_lon: Option<f64>,
    pub color_space: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_image_serialization() {
        let image = Image {
            id: 1,
            blake3_hash: "abc123".to_string(),
            filename: "test.CR3".to_string(),
            extension: "CR3".to_string(),
            width: Some(6000),
            height: Some(4000),
            orientation: 0,
            file_size_bytes: Some(25000000),
            captured_at: Some(Utc::now()),
            imported_at: Utc::now(),
            folder_id: Some(1),
        };

        let json = serde_json::to_string(&image).unwrap();
        let deserialized: Image = serde_json::from_str(&json).unwrap();

        assert_eq!(image.id, deserialized.id);
        assert_eq!(image.filename, deserialized.filename);
        assert_eq!(image.extension, deserialized.extension);
    }

    #[test]
    fn test_collection_type_serialization() {
        let collection_type = CollectionType::Smart;
        let json = serde_json::to_string(&collection_type).unwrap();
        let deserialized: CollectionType = serde_json::from_str(&json).unwrap();

        assert_eq!(collection_type, deserialized);
    }
}

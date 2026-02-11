use serde::{Deserialize, Serialize};

/// DTO for image list responses
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageDTO {
    pub id: u32,
    pub blake3_hash: String,
    pub filename: String,
    pub extension: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub rating: Option<u8>,
    pub flag: Option<String>,
    pub captured_at: Option<String>,
    pub imported_at: String,
}

/// DTO for detailed image information
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageDetailDTO {
    pub id: u32,
    pub blake3_hash: String,
    pub filename: String,
    pub extension: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub rating: Option<u8>,
    pub flag: Option<String>,
    pub captured_at: Option<String>,
    pub imported_at: String,
    pub exif_metadata: Option<ExifMetadataDTO>,
    pub folder_id: Option<u32>,
}

/// DTO for EXIF metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct ExifMetadataDTO {
    pub iso: Option<u32>,
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

/// DTO for collection responses
#[derive(Debug, Serialize, Deserialize)]
pub struct CollectionDTO {
    pub id: u32,
    pub name: String,
    pub collection_type: String,
    pub parent_id: Option<u32>,
    pub image_count: u32,
}

/// DTO for creating collections
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCollectionDTO {
    pub name: String,
    pub collection_type: String,
    pub parent_id: Option<u32>,
}

/// DTO for image filtering
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageFilter {
    pub rating_min: Option<u8>,
    pub rating_max: Option<u8>,
    pub flag: Option<String>,
    pub folder_id: Option<u32>,
    pub search_text: Option<String>,
}

/// Standard result type for Tauri commands
pub type CommandResult<T> = Result<T, String>;

/// Convert database Image to ImageDTO
impl From<crate::models::catalog::Image> for ImageDTO {
    fn from(image: crate::models::catalog::Image) -> Self {
        Self {
            id: image.id as u32,
            blake3_hash: image.blake3_hash,
            filename: image.filename,
            extension: image.extension,
            width: image.width.map(|w| w as u32),
            height: image.height.map(|h| h as u32),
            rating: None, // Will be populated from image_state join
            flag: None,   // Will be populated from image_state join
            captured_at: image.captured_at.map(|dt: chrono::DateTime<chrono::Utc>| dt.to_rfc3339()),
            imported_at: image.imported_at.to_rfc3339(),
        }
    }
}

/// Convert database Collection to CollectionDTO
impl From<crate::models::catalog::Collection> for CollectionDTO {
    fn from(collection: crate::models::catalog::Collection) -> Self {
        Self {
            id: collection.id as u32,
            name: collection.name,
            collection_type: match collection.collection_type {
                crate::models::catalog::CollectionType::Static => "static".to_string(),
                crate::models::catalog::CollectionType::Smart => "smart".to_string(),
                crate::models::catalog::CollectionType::Quick => "quick".to_string(),
            },
            parent_id: collection.parent_id.map(|id| id as u32),
            image_count: 0, // Will be calculated with a separate query
        }
    }
}

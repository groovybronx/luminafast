use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Utilisé à partir de Phase 4.2 (image rendering pipeline) et Phase 5+ (édition, EXIF)
pub struct Image {
    pub id: Option<i64>,
    pub filename: String,
    pub filepath: String,
    pub file_hash: String,
    pub file_size: i64,
    pub captured_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Métadonnées EXIF (JSON)
    pub exif_data: Option<ExifData>,

    // État utilisateur
    pub rating: i32,
    pub flag: Option<ImageFlag>,
    pub color_label: Option<ColorLabel>,

    // Édition
    pub edit_data: Option<EditData>,
    pub edit_version: i32,

    // Sync
    pub is_synced: bool,
    pub sync_revision: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Utilisé à partir de Phase 5.1 (panneau EXIF connecté)
pub struct ExifData {
    pub iso: Option<i32>,
    pub fstop: Option<f64>,
    pub shutter: Option<String>,
    pub lens: Option<String>,
    pub camera: Option<String>,
    pub location: Option<String>,
    pub focal_length: Option<i32>,
    pub flash: Option<bool>,
    pub white_balance: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Utilisé à partir de Phase 4.2 (pipeline de rendu image) et Phase 5+ (édition)
pub struct EditData {
    pub exposure: Option<f64>,
    pub contrast: Option<f64>,
    pub highlights: Option<f64>,
    pub shadows: Option<f64>,
    pub temp: Option<f64>,
    pub tint: Option<f64>,
    pub vibrance: Option<f64>,
    pub saturation: Option<f64>,
    pub clarity: Option<f64>,
    pub sharpening: Option<f64>,
    pub noise_reduction: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)] // Utilisé à partir de Phase 5.3 (rating & flagging persistants)
pub enum ImageFlag {
    Pick,
    Reject,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)] // Utilisé à partir de Phase 5.3 (système de tagging hiérarchique et labels)
pub enum ColorLabel {
    Red,
    Yellow,
    Green,
    Blue,
    Purple,
}

/// New image for insertion (without id and timestamps)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Utilisé en Phase 2.1 (ingestion) et Phase 4.2+ (API image complète)
pub struct NewImage {
    pub filename: String,
    pub filepath: String,
    pub file_hash: String,
    pub file_size: i64,
    pub captured_at: Option<DateTime<Utc>>,
    pub exif_data: Option<ExifData>,
}

/// Image update payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Utilisé à partir de Phase 4.2 (pipeline de rendu image) et Phase 5+ (édition/tagging)
pub struct ImageUpdate {
    pub rating: Option<i32>,
    pub flag: Option<Option<ImageFlag>>, // None means no change, Some(None) means clear flag
    pub color_label: Option<Option<ColorLabel>>,
    pub edit_data: Option<EditData>,
    pub is_synced: Option<bool>,
    pub sync_revision: Option<Option<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_image_serialization() {
        let image = Image {
            id: Some(1),
            filename: "test.jpg".to_string(),
            filepath: "/path/to/test.jpg".to_string(),
            file_hash: "abc123".to_string(),
            file_size: 1024,
            captured_at: Some(Utc::now()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            exif_data: Some(ExifData {
                iso: Some(400),
                fstop: Some(2.8),
                shutter: Some("1/250".to_string()),
                lens: Some("50mm".to_string()),
                camera: Some("Canon EOS R5".to_string()),
                location: Some("Paris".to_string()),
                focal_length: Some(50),
                flash: Some(false),
                white_balance: Some("Auto".to_string()),
            }),
            rating: 4,
            flag: Some(ImageFlag::Pick),
            color_label: Some(ColorLabel::Red),
            edit_data: Some(EditData {
                exposure: Some(0.5),
                contrast: Some(10.0),
                highlights: Some(-5.0),
                shadows: Some(5.0),
                temp: Some(5500.0),
                tint: Some(0.0),
                vibrance: Some(10.0),
                saturation: Some(5.0),
                clarity: Some(5.0),
                sharpening: Some(25.0),
                noise_reduction: Some(10.0),
            }),
            edit_version: 1,
            is_synced: false,
            sync_revision: None,
        };

        // Test serialization
        let json = serde_json::to_string(&image).unwrap();
        let deserialized: Image = serde_json::from_str(&json).unwrap();

        assert_eq!(image.filename, deserialized.filename);
        assert_eq!(image.rating, deserialized.rating);
        assert_eq!(image.flag, deserialized.flag);
    }
}

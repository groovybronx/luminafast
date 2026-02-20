//! Modèle EXIF pour LuminaFast
//! Correspond exactement au schéma SQL de la table exif_metadata (migration 001_initial.sql)
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExifMetadata {
    pub iso: Option<u32>,
    pub aperture: Option<f32>,        // f-number
    /// Shutter speed stored as log2(seconds) for efficient SQL sorting
    /// Example: 1/125s → log2(1/125) ≈ -6.97, 1s → 0, 30s → 4.91
    pub shutter_speed: Option<f32>,   // log2(seconds)
    pub focal_length: Option<f32>,    // mm
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
    fn test_exif_metadata_struct() {
        let exif = ExifMetadata {
            iso: Some(100),
            aperture: Some(2.8),
            shutter_speed: Some(-6.97), // log2(1/125s)
            focal_length: Some(50.0),
            lens: Some("MockLens 50mm".to_string()),
            camera_make: Some("MockMake".to_string()),
            camera_model: Some("MockCam X".to_string()),
            gps_lat: Some(48.8566),
            gps_lon: Some(2.3522),
            color_space: Some("sRGB".to_string()),
        };
        assert_eq!(exif.iso, Some(100));
        assert_eq!(exif.camera_model.as_deref(), Some("MockCam X"));
        assert_eq!(exif.focal_length, Some(50.0));
    }
}

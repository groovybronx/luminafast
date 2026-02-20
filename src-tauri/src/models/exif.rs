//! Modèle EXIF pour LuminaFast
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExifMetadata {
    pub iso: Option<u32>,
    pub aperture: Option<f32>,
    pub shutter_speed: Option<f32>,
    pub date: Option<String>,
    pub gps: Option<(f64, f64)>,
    pub camera_model: Option<String>,
    pub lens_model: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exif_metadata_struct() {
        let exif = ExifMetadata {
            iso: Some(100),
            aperture: Some(2.8),
            shutter_speed: Some(1.0 / 125.0),
            date: Some("2026-02-20".to_string()),
            gps: Some((48.8566, 2.3522)),
            camera_model: Some("MockCam X".to_string()),
            lens_model: Some("MockLens 50mm".to_string()),
        };
        assert_eq!(exif.iso, Some(100));
        assert_eq!(exif.camera_model.as_deref(), Some("MockCam X"));
    }
}

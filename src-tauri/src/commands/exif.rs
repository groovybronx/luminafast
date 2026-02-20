//! Commandes Tauri pour extraction EXIF
use tauri::command;
use crate::models::exif::ExifMetadata;

#[command]
pub async fn extract_exif(file_path: String) -> Result<ExifMetadata, String> {
    // TODO: Appeler le service réel d'extraction EXIF
    Ok(ExifMetadata {
        iso: Some(100),
        aperture: Some(2.8),
        shutter_speed: Some(1.0/125.0),
        date: Some("2026-02-20".to_string()),
        gps: None,
        camera_model: Some("MockCam X".to_string()),
        lens_model: Some("MockLens 50mm".to_string()),
    })
}

#[command]
pub async fn extract_exif_batch(file_paths: Vec<String>) -> Result<Vec<ExifMetadata>, String> {
    // TODO: Extraction batch
    Ok(file_paths.iter().map(|_| ExifMetadata {
        iso: Some(100),
        aperture: Some(2.8),
        shutter_speed: Some(1.0/125.0),
        date: Some("2026-02-20".to_string()),
        gps: None,
        camera_model: Some("MockCam X".to_string()),
        lens_model: Some("MockLens 50mm".to_string()),
    }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_extract_exif_returns_mock() {
        let result = extract_exif("/mock/path.jpg".to_string()).await;
        assert!(result.is_ok());
        let exif = result.unwrap();
        assert_eq!(exif.iso, Some(100));
        assert_eq!(exif.camera_model.as_deref(), Some("MockCam X"));
    }

    #[tokio::test]
    async fn test_extract_exif_batch_returns_vec() {
        let paths = vec!["/mock/1.jpg".to_string(), "/mock/2.jpg".to_string()];
        let result = extract_exif_batch(paths).await;
        assert!(result.is_ok());
        let exifs = result.unwrap();
        assert_eq!(exifs.len(), 2);
    }
}

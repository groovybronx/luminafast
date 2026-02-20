//! Commandes Tauri pour extraction EXIF
//! Phase 2.2 - Harvesting Métadonnées EXIF/IPTC
use tauri::command;
use crate::models::exif::ExifMetadata;
use crate::services::exif;

/// Extrait les métadonnées EXIF d'un fichier image
/// 
/// # Arguments
/// * `file_path` - Chemin absolu vers le fichier image
/// 
/// # Returns
/// * `Ok(ExifMetadata)` - Métadonnées extraites avec succès
/// * `Err(String)` - Erreur lors de l'extraction
#[command]
pub async fn extract_exif(file_path: String) -> Result<ExifMetadata, String> {
    // Appeler le service réel d'extraction EXIF
    exif::extract_exif_metadata(&file_path)
}

/// Extrait les métadonnées EXIF de plusieurs fichiers images en batch
/// 
/// # Arguments
/// * `file_paths` - Liste des chemins absolus vers les fichiers images
/// 
/// # Returns
/// * `Ok(Vec<ExifMetadata>)` - Vecteur des métadonnées extraites (ignore les erreurs)
/// * `Err(String)` - Erreur critique
#[command]
pub async fn extract_exif_batch(file_paths: Vec<String>) -> Result<Vec<ExifMetadata>, String> {
    // Extraction batch: collecte les succès, ignore les erreurs individuelles
    let results: Vec<ExifMetadata> = file_paths
        .iter()
        .filter_map(|path| exif::extract_exif_metadata(path).ok())
        .collect();
    
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_extract_exif_from_nonexistent_file() {
        let result = extract_exif("/nonexistent/path.jpg".to_string()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot open file"));
    }

    #[tokio::test]
    async fn test_extract_exif_batch_filters_errors() {
        let paths = vec![
            "/nonexistent/1.jpg".to_string(),
            "/nonexistent/2.jpg".to_string(),
        ];
        let result = extract_exif_batch(paths).await;
        // Les fichiers inexistants sont filtrés, donc vecteur vide
        assert!(result.is_ok());
        let exifs = result.unwrap();
        assert_eq!(exifs.len(), 0);
    }
}

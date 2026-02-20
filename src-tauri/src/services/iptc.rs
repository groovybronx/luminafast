//! Service IPTC pour extraction des métadonnées
//! Phase 2.2 - Extraction IPTC : titre, description, copyright, mots-clés
#![allow(dead_code)] // Implémentation complète prévue en Phase 2.2
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IptcMetadata {
    pub copyright: Option<String>,
    pub keywords: Vec<String>,
    pub description: Option<String>,
    pub author: Option<String>,
}

/// Extrait les métadonnées IPTC d'un fichier image
/// # Arguments
/// * `file_path` - Chemin vers le fichier image
/// # Returns
/// * `Ok(IptcMetadata)` - Métadonnées IPTC extraites
/// * `Err(String)` - Erreur lors de l'extraction
/// # Note
/// Pour l'instant retourne des données vides. L'implémentation complète nécessite
/// soit l'extension de kamadak-exif pour IPTC/XMP, soit l'ajout de img-parts crate.
pub fn extract_iptc(_file_path: &str) -> Result<IptcMetadata, String> {
    // TODO Phase 2.2: Implémenter extraction réelle IPTC/XMP
    // Option A: Vérifier si kamadak-exif supporte les tags IPTC
    // Option B: Ajouter img-parts crate pour parsing XMP/IPTC complet
    Ok(IptcMetadata {
        copyright: None,
        keywords: vec![],
        description: None,
        author: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_iptc_metadata_struct() {
        let iptc = IptcMetadata {
            copyright: Some("Copilot".to_string()),
            keywords: vec!["test".to_string(), "photo".to_string()],
            description: Some("Test IPTC".to_string()),
            author: Some("Test Author".to_string()),
        };
        assert_eq!(iptc.keywords.len(), 2);
        assert_eq!(iptc.description.as_deref(), Some("Test IPTC"));
    }

    #[test]
    fn test_extract_iptc_returns_empty() {
        // Pour l'instant, retourne des données vides
        let result = extract_iptc("/mock/path.jpg");
        assert!(result.is_ok());
        let iptc = result.unwrap();
        assert_eq!(iptc.keywords.len(), 0);
    }
}

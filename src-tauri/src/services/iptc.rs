//! Service IPTC pour extraction des métadonnées
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct IptcMetadata {
    pub copyright: Option<String>,
    pub keywords: Vec<String>,
    pub description: Option<String>,
}

pub fn extract_iptc(file_path: &str) -> Result<IptcMetadata, String> {
    // TODO: Implémenter extraction réelle IPTC
    Ok(IptcMetadata {
        copyright: None,
        keywords: vec![],
        description: None,
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
        };
        assert_eq!(iptc.keywords.len(), 2);
        assert_eq!(iptc.description.as_deref(), Some("Test IPTC"));
    }
}

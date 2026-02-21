#![allow(dead_code)] // Modèles preview planifiés pour la Phase 2.3

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

/// Types de previews disponibles (pyramide d'images)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PreviewType {
    /// Thumbnail pour grille (240px bord long, JPEG q75)
    Thumbnail,
    /// Standard pour affichage plein écran (1440px bord long, JPEG q85)
    Standard,
    /// 1:1 pour zoom pixel (résolution native, JPEG q90)
    OneToOne,
}

impl PreviewType {
    pub fn default_size(&self) -> (u32, u32) {
        match self {
            PreviewType::Thumbnail => (240, 240),
            PreviewType::Standard => (1440, 1080),
            PreviewType::OneToOne => (0, 0), // Résolution native
        }
    }

    pub fn jpeg_quality(&self) -> u8 {
        match self {
            PreviewType::Thumbnail => 75,
            PreviewType::Standard => 85,
            PreviewType::OneToOne => 90,
        }
    }

    pub fn max_file_size(&self) -> u64 {
        match self {
            PreviewType::Thumbnail => 50 * 1024,      // 50KB
            PreviewType::Standard => 500 * 1024,      // 500KB
            PreviewType::OneToOne => 2 * 1024 * 1024, // 2MB
        }
    }

    pub fn subdir_name(&self) -> &'static str {
        match self {
            PreviewType::Thumbnail => "thumbnails",
            PreviewType::Standard => "standard",
            PreviewType::OneToOne => "native",
        }
    }
}

/// Configuration pour la génération de previews (pyramide d'images)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewConfig {
    /// Répertoire du catalogue (contient Previews.lrdata/)
    pub catalog_dir: PathBuf,
    /// Nombre de threads pour traitement parallèle
    pub parallel_threads: usize,
    /// Timeout pour génération (secondes)
    pub generation_timeout: u64,
    /// Utiliser libvips si disponible, sinon image crate
    pub use_libvips: bool,
}

impl Default for PreviewConfig {
    fn default() -> Self {
        let mut catalog_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        catalog_dir.push("Pictures");
        catalog_dir.push("LuminaFast");

        Self {
            catalog_dir,
            parallel_threads: num_cpus::get(),
            generation_timeout: 30,
            use_libvips: false, // Pour l'instant, utiliser image crate
        }
    }
}

impl PreviewConfig {
    /// Récupère le répertoire des previews
    pub fn previews_dir(&self) -> PathBuf {
        self.catalog_dir.join("Previews.lrdata")
    }

    /// Récupère le répertoire pour un type de preview
    pub fn preview_type_dir(&self, preview_type: PreviewType) -> PathBuf {
        self.previews_dir().join(preview_type.subdir_name())
    }
}

/// Résultat de la génération d'une preview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewResult {
    /// Chemin vers le fichier preview généré
    pub path: PathBuf,
    /// Type de preview
    pub preview_type: PreviewType,
    /// Dimensions réelles (largeur, hauteur)
    pub size: (u32, u32),
    /// Taille du fichier en octets
    pub file_size: u64,
    /// Temps de génération
    pub generation_time: std::time::Duration,
    /// Hash BLAKE3 du fichier original
    pub source_hash: String,
    /// Timestamp de génération
    pub generated_at: DateTime<Utc>,
}

/// Métadonnées d'une preview dans la base de données previews.db
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewRecord {
    /// ID unique de la preview
    pub id: i64,
    /// Hash BLAKE3 du fichier source
    pub source_hash: String,
    /// Type de preview
    pub preview_type: PreviewType,
    /// Chemin relatif depuis Previews.lrdata/
    pub relative_path: String,
    /// Dimensions réelles (largeur, hauteur)
    pub width: u32,
    pub height: u32,
    /// Taille du fichier en octets
    pub file_size: u64,
    /// Qualité JPEG utilisée
    pub jpeg_quality: u8,
    /// Date de génération
    pub generated_at: DateTime<Utc>,
    /// Date de dernier accès
    pub last_accessed: DateTime<Utc>,
    /// Nombre d'accès
    pub access_count: u64,
}

/// Nouvelle preview à insérer dans la base
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewPreviewRecord {
    pub source_hash: String,
    pub preview_type: PreviewType,
    pub relative_path: String,
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub jpeg_quality: u8,
}

/// Informations sur le cache de previews
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewCacheInfo {
    /// Nombre total de previews en cache
    pub total_previews: usize,
    /// Taille totale du cache (octets)
    pub total_size: u64,
    /// Nombre de thumbnails
    pub thumbnail_count: usize,
    /// Nombre de previews
    pub preview_count: usize,
    /// Dernier cleanup
    pub last_cleanup: Option<DateTime<Utc>>,
}

/// Statistiques de génération batch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchPreviewStats {
    /// ID unique du batch
    pub batch_id: Uuid,
    /// Nombre total de fichiers traités
    pub total_files: usize,
    /// Nombre de succès
    pub successful_count: usize,
    /// Nombre d'échecs
    pub failed_count: usize,
    /// Nombre de fichiers skip (déjà en cache)
    pub skipped_count: usize,
    /// Temps total de traitement
    pub total_duration: std::time::Duration,
    /// Temps moyen par fichier
    pub avg_time_per_file: std::time::Duration,
    /// Timestamp de début
    pub started_at: DateTime<Utc>,
    /// Timestamp de fin
    pub completed_at: Option<DateTime<Utc>>,
}

/// Erreurs spécifiques au service preview
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum PreviewError {
    #[error("Fichier RAW non supporté: {format}")]
    UnsupportedFormat { format: String },

    #[error("Fichier corrompu ou illisible: {path}")]
    CorruptedFile { path: String },

    #[error("Erreur de traitement RAW: {message}")]
    ProcessingError { message: String },

    #[error("Erreur d'écriture preview: {path}")]
    WriteError { path: String },

    #[error("Erreur cache: {message}")]
    CacheError { message: String },

    #[error("Timeout génération: {timeout}s")]
    GenerationTimeout { timeout: u64 },

    /*     #[error("Mémoire insuffisante pour traitement")]
    OutOfMemory, */
    #[error("Erreur I/O: {message}")]
    IoError { message: String },
}

/// État d'une preview dans le cache
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PreviewStatus {
    /// Preview générée et valide
    Ready,
    /// En cours de génération
    Generating,
    /// Erreur de génération
    Failed,
    /// Obsolète (fichier source modifié)
    Stale,
}

/// Métadonnées d'une preview en cache
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewMetadata {
    /// Hash BLAKE3 du fichier source
    pub source_hash: String,
    /// Type de preview
    pub preview_type: PreviewType,
    /// Chemin du fichier preview
    pub path: PathBuf,
    /// État actuel
    pub status: PreviewStatus,
    /// Taille du fichier preview
    pub file_size: u64,
    /// Dimensions
    pub size: (u32, u32),
    /// Date de génération
    pub generated_at: DateTime<Utc>,
    /// Dernier accès
    pub last_accessed: DateTime<Utc>,
    /// Nombre d'accès
    pub access_count: u64,
}

/// Événement de progression de génération
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewProgressEvent {
    /// ID unique de l'événement
    pub id: Uuid,
    /// Type de preview
    pub preview_type: PreviewType,
    /// Chemin du fichier source
    pub source_path: PathBuf,
    /// Progression (0.0 à 1.0)
    pub progress: f64,
    /// Message de statut
    pub message: String,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
    /// Statistiques complètes (pour batch_completed)
    pub stats: Option<BatchPreviewStats>,
}

/// Configuration du cache cleanup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheCleanupConfig {
    /// Taille maximale du cache (octets)
    pub max_cache_size: u64,
    /// Âge maximal des previews (jours)
    pub max_age_days: u32,
    /// Nombre maximal de previews par type
    pub max_previews_per_type: usize,
    /// Fréquence de cleanup (heures)
    pub cleanup_interval_hours: u32,
}

impl Default for CacheCleanupConfig {
    fn default() -> Self {
        Self {
            max_cache_size: 2 * 1024 * 1024 * 1024, // 2GB
            max_age_days: 30,
            max_previews_per_type: 10000,
            cleanup_interval_hours: 24,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_preview_type_defaults() {
        assert_eq!(PreviewType::Thumbnail.default_size(), (240, 240));
        assert_eq!(PreviewType::Standard.default_size(), (1440, 1080));
        assert_eq!(PreviewType::OneToOne.default_size(), (0, 0)); // Résolution native

        assert_eq!(PreviewType::Thumbnail.jpeg_quality(), 75);
        assert_eq!(PreviewType::Standard.jpeg_quality(), 85);
        assert_eq!(PreviewType::OneToOne.jpeg_quality(), 90);

        assert_eq!(PreviewType::Thumbnail.max_file_size(), 50 * 1024);
        assert_eq!(PreviewType::Standard.max_file_size(), 500 * 1024);
        assert_eq!(PreviewType::OneToOne.max_file_size(), 2 * 1024 * 1024);

        assert_eq!(PreviewType::Thumbnail.subdir_name(), "thumbnails");
        assert_eq!(PreviewType::Standard.subdir_name(), "standard");
        assert_eq!(PreviewType::OneToOne.subdir_name(), "native");
    }

    #[test]
    fn test_preview_config_default() {
        let config = PreviewConfig::default();
        assert_eq!(config.generation_timeout, 30);
        assert!(!config.use_libvips);
        assert!(config.parallel_threads > 0);
        assert!(config.catalog_dir.ends_with("Pictures/LuminaFast"));
        assert!(config.previews_dir().ends_with("Previews.lrdata"));
    }

    #[test]
    fn test_preview_result_serialization() {
        let result = PreviewResult {
            path: PathBuf::from("/test/preview.jpg"),
            preview_type: PreviewType::Thumbnail,
            size: (240, 180),
            file_size: 1024,
            generation_time: Duration::from_millis(100),
            source_hash: "b3a1c2d3".to_string(),
            generated_at: Utc::now(),
        };

        let serialized = serde_json::to_string(&result).unwrap();
        let deserialized: PreviewResult = serde_json::from_str(&serialized).unwrap();

        assert_eq!(result.preview_type, deserialized.preview_type);
        assert_eq!(result.size, deserialized.size);
        assert_eq!(result.file_size, deserialized.file_size);
    }

    #[test]
    fn test_preview_error_display() {
        let error = PreviewError::UnsupportedFormat {
            format: "cr3".to_string(),
        };
        assert!(error.to_string().contains("cr3"));

        let error = PreviewError::GenerationTimeout { timeout: 30u64 };
        assert!(error.to_string().contains("30s"));
    }

    #[test]
    fn test_cache_cleanup_config_default() {
        let config = CacheCleanupConfig::default();
        assert_eq!(config.max_cache_size, 2 * 1024 * 1024 * 1024);
        assert_eq!(config.max_age_days, 30);
        assert_eq!(config.max_previews_per_type, 10000);
        assert_eq!(config.cleanup_interval_hours, 24);
    }
}

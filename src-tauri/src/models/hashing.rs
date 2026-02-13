use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Types de hash supportés
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HashType {
    Blake3,
}

/// Résultat du hachage d'un fichier
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileHash {
    /// Hash BLAKE3 du fichier (64 caractères hex)
    pub hash: String,
    /// Type de hash utilisé
    pub hash_type: HashType,
    /// Taille du fichier en octets
    pub file_size: u64,
    /// Timestamp du hachage
    pub hashed_at: chrono::DateTime<chrono::Utc>,
}

/// Information de doublon détecté
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DuplicateInfo {
    /// Hash du fichier en double
    pub hash: String,
    /// Chemins des fichiers ayant ce hash
    pub file_paths: Vec<PathBuf>,
    /// Taille du fichier (identique pour tous les doublons)
    pub file_size: u64,
    /// Date de première détection
    pub first_detected: chrono::DateTime<chrono::Utc>,
}

/// Résultat de l'analyse de doublons
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DuplicateAnalysis {
    /// Total des fichiers analysés
    pub total_files: u32,
    /// Nombre de groupes de doublons trouvés
    pub duplicate_groups: u32,
    /// Nombre total de fichiers en double
    pub duplicate_files: u32,
    /// Espace total gaspillé par les doublons
    pub wasted_space: u64,
    /// Détail de chaque groupe de doublons
    pub duplicates: Vec<DuplicateInfo>,
}

/// Progression du hachage en cours
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HashProgress {
    /// Nombre de fichiers traités
    pub processed_files: u32,
    /// Nombre total de fichiers à traiter
    pub total_files: u32,
    /// Fichier actuellement en cours de traitement
    pub current_file: Option<PathBuf>,
    /// Pourcentage de progression (0.0 - 1.0)
    pub progress: f64,
}

/// Erreurs de hachage
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HashError {
    /// Fichier non trouvé
    FileNotFound(PathBuf),
    /// Permission refusée
    PermissionDenied(PathBuf),
    /// Erreur de lecture
    ReadError(PathBuf, String),
    /// Fichier trop gros pour le traitement
    FileTooLarge(PathBuf, u64),
    /// Erreur interne de hachage
    HashError(String),
}

impl std::fmt::Display for HashError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HashError::FileNotFound(path) => write!(f, "Fichier non trouvé: {:?}", path),
            HashError::PermissionDenied(path) => write!(f, "Permission refusée: {:?}", path),
            HashError::ReadError(path, msg) => write!(f, "Erreur lecture {:?}: {}", path, msg),
            HashError::FileTooLarge(path, size) => write!(f, "Fichier trop gros {:?}: {} octets", path, size),
            HashError::HashError(msg) => write!(f, "Erreur de hachage: {}", msg),
        }
    }
}

impl std::error::Error for HashError {}

/// Type de résultat pour les opérations de hachage
pub type HashResult<T> = Result<T, HashError>;

/// Configuration du service de hachage
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HashConfig {
    /// Taille maximale des fichiers à traiter (en octets)
    pub max_file_size: Option<u64>,
    /// Nombre de threads parallèles (None = auto)
    pub thread_count: Option<usize>,
    /// Taille des chunks pour le streaming (en octets)
    pub chunk_size: usize,
    /// Activer le cache des hashes
    pub enable_cache: bool,
}

impl Default for HashConfig {
    fn default() -> Self {
        Self {
            max_file_size: Some(10 * 1024 * 1024 * 1024), // 10GB
            thread_count: None, // Auto-détecter
            chunk_size: 64 * 1024, // 64KB
            enable_cache: true,
        }
    }
}

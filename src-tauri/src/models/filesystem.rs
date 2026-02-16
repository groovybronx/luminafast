use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;
use chrono::{DateTime, Utc};
use uuid::Uuid;

// Modules de sérialisation personnalisés
mod path_buf_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::path::PathBuf;
    use std::str::FromStr;

    pub fn serialize<S>(path: &PathBuf, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = path.to_string_lossy();
        serializer.serialize_str(&s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<PathBuf, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Ok(PathBuf::from_str(&s).map_err(serde::de::Error::custom)?)
    }
}

mod chrono_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use chrono::{DateTime, Utc};

    pub fn serialize<S>(dt: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = dt.to_rfc3339();
        serializer.serialize_str(&s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        DateTime::parse_from_rfc3339(&s)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(serde::de::Error::custom)
    }
}

mod option_duration_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::Duration;

    pub fn serialize<S>(duration: &Option<Duration>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match duration {
            Some(d) => serializer.serialize_u64(d.as_millis() as u64),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Duration>, D::Error>
    where
        D: Deserializer<'de>,
    {
        Ok(Some(Duration::from_millis(u64::deserialize(deserializer)?)))
    }
}

mod option_chrono_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use chrono::{DateTime, Utc};

    pub fn serialize<S>(dt: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match dt {
            Some(d) => {
                let s = d.to_rfc3339();
                serializer.serialize_str(&s)
            }
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Ok(Some(DateTime::parse_from_rfc3339(&s)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(serde::de::Error::custom)?))
    }
}

/// Types d'événements filesystem
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FileEventType {
    /// Fichier créé
    Created,
    /// Fichier modifié
    Modified,
    /// Fichier supprimé
    Deleted,
    /// Fichier renommé
    Renamed { from: PathBuf, to: PathBuf },
    /// Dossier créé
    DirectoryCreated,
    /// Dossier supprimé
    DirectoryDeleted,
    /// Erreur lors du traitement
    Error,
}

/// Événement filesystem avec métadonnées
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEvent {
    /// ID unique de l'événement
    pub id: Uuid,
    /// Type d'événement
    pub event_type: FileEventType,
    /// Chemin du fichier concerné
    #[serde(with = "path_buf_serde")]
    pub path: PathBuf,
    /// Timestamp de l'événement
    #[serde(with = "chrono_serde")]
    pub timestamp: DateTime<Utc>,
    /// Taille du fichier (si applicable)
    pub size: Option<u64>,
    /// Type MIME (si détecté)
    pub mime_type: Option<String>,
    /// Métadonnées supplémentaires
    pub metadata: FileEventMetadata,
}

/// Métadonnées d'événement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEventMetadata {
    /// Permissions du fichier
    pub permissions: Option<u32>,
    /// Est-ce un dossier ?
    pub is_directory: bool,
    /// Est-ce un fichier caché ?
    pub is_hidden: bool,
    /// Extension du fichier
    pub extension: Option<String>,
    /// Hash BLAKE3 (si disponible)
    pub blake3_hash: Option<String>,
}

/// Types de verrous fichiers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FileLockType {
    /// Verrou partagé (lectures multiples autorisées)
    Shared,
    /// Verrou exclusif (accès unique)
    Exclusive,
    /// Verrou en écriture (un écrivain, plusieurs lecteurs)
    Write,
}

/// Information sur un verrou fichier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileLock {
    /// ID unique du verrou
    pub id: Uuid,
    /// Chemin du fichier verrouillé
    #[serde(with = "path_buf_serde")]
    pub path: PathBuf,
    /// Type de verrou
    pub lock_type: FileLockType,
    /// ID du processus qui possède le verrou
    pub process_id: u32,
    /// Timestamp de création du verrou
    #[serde(with = "chrono_serde")]
    pub created_at: DateTime<Utc>,
    /// Timeout du verrou
    #[serde(with = "option_duration_serde", default)]
    pub timeout: Option<Duration>,
    /// Est-ce un verrou hérité ?
    pub inherited: bool,
}

/// Configuration du watcher filesystem
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatcherConfig {
    /// Chemin à surveiller
    #[serde(with = "path_buf_serde")]
    pub path: PathBuf,
    /// Surveillance récursive des sous-dossiers ?
    pub recursive: bool,
    /// Types d'événements à surveiller
    pub watch_events: Vec<FileEventType>,
    /// Filtres par extension (ex: ["jpg", "cr3", "raf"])
    pub extensions_filter: Option<Vec<String>>,
    /// Filtres par pattern (ex: ["IMG_*", "DSC_*"])
    pub pattern_filter: Option<Vec<String>>,
    /// Ignorer les dossiers cachés ?
    pub ignore_hidden: bool,
    /// Debouncing timeout en ms
    pub debounce_timeout: u64,
    /// Taille maximale des fichiers à traiter
    pub max_file_size: Option<u64>,
}

/// Statistiques du watcher
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatcherStats {
    /// ID du watcher
    pub watcher_id: Uuid,
    /// Chemin surveillé
    #[serde(with = "path_buf_serde")]
    pub path: PathBuf,
    /// Nombre d'événements traités
    pub events_processed: u64,
    /// Nombre d'erreurs
    pub errors: u64,
    /// Timestamp de début
    #[serde(with = "chrono_serde")]
    pub started_at: DateTime<Utc>,
    /// Timestamp du dernier événement
    #[serde(with = "option_chrono_serde", default)]
    pub last_event_at: Option<DateTime<Utc>>,
    /// Nombre de fichiers surveillés
    pub files_watched: u64,
    /// Nombre de dossiers surveillés
    pub directories_watched: u64,
    /// Mémoire utilisée (bytes)
    pub memory_usage: u64,
}

/// État du service filesystem
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilesystemState {
    /// Watchers actifs
    pub active_watchers: Vec<WatcherStats>,
    /// Verrous actifs
    pub active_locks: Vec<FileLock>,
    /// Queue d'événements en attente
    pub pending_events: u64,
    /// Événements traités par seconde
    pub events_per_second: f64,
    /// Timestamp de dernière mise à jour
    pub last_updated: DateTime<Utc>,
}

/// Erreurs filesystem
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum FilesystemError {
    /// Erreur de permission
    #[error("Permission denied for path: {0}")]
    PermissionDenied(String),
    /// Fichier non trouvé
    #[error("File not found: {0}")]
    FileNotFound(String),
    /// Verrou déjà acquis
    #[error("Lock already acquired for path: {0}")]
    LockAlreadyAcquired(String),
    /// Timeout du verrou
    #[error("Lock timeout for path: {0}")]
    LockTimeout(String),
    /// Erreur I/O
    #[error("IO error: {0}")]
    IoError(String),
    /// Erreur de watcher
    #[error("Watcher error: {0}")]
    WatcherError(String),
    /// Chemin invalide
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    /// Fichier trop grand
    #[error("File too large: {0} bytes (max: {1})")]
    FileTooLarge(u64, u64),
    /// Erreur de parsing MIME
    #[error("MIME type detection failed: {0}")]
    MimeError(String),
}

impl From<FilesystemError> for String {
    fn from(error: FilesystemError) -> Self {
        error.to_string()
    }
}

/// Résultat d'opération filesystem
pub type FilesystemResult<T> = Result<T, FilesystemError>;

/// Tests unitaires
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_file_event_creation() {
        let event = FileEvent {
            id: Uuid::new_v4(),
            event_type: FileEventType::Created,
            path: PathBuf::from("/test/image.jpg"),
            timestamp: Utc::now(),
            size: Some(1024),
            mime_type: Some("image/jpeg".to_string()),
            metadata: FileEventMetadata {
                permissions: Some(644),
                is_directory: false,
                is_hidden: false,
                extension: Some("jpg".to_string()),
                blake3_hash: None,
            },
        };

        assert_eq!(event.event_type, FileEventType::Created);
        assert_eq!(event.size, Some(1024));
        assert_eq!(event.mime_type, Some("image/jpeg".to_string()));
    }

    #[test]
    fn test_file_lock_creation() {
        let lock = FileLock {
            id: Uuid::new_v4(),
            path: PathBuf::from("/test/image.jpg"),
            lock_type: FileLockType::Exclusive,
            process_id: 1234,
            created_at: Utc::now(),
            timeout: Some(std::time::Duration::from_secs(30)),
            inherited: false,
        };

        assert_eq!(lock.lock_type, FileLockType::Exclusive);
        assert_eq!(lock.process_id, 1234);
        assert_eq!(lock.timeout, Some(std::time::Duration::from_secs(30)));
    }

    #[test]
    fn test_watcher_config() {
        let config = WatcherConfig {
            path: PathBuf::from("/test"),
            recursive: true,
            watch_events: vec![
                FileEventType::Created,
                FileEventType::Modified,
                FileEventType::Deleted,
            ],
            extensions_filter: Some(vec!["jpg".to_string(), "cr3".to_string()]),
            pattern_filter: None,
            ignore_hidden: true,
            debounce_timeout: 100,
            max_file_size: Some(100 * 1024 * 1024), // 100MB
        };

        assert!(config.recursive);
        assert_eq!(config.watch_events.len(), 3);
        assert_eq!(config.debounce_timeout, 100);
        assert_eq!(config.max_file_size, Some(104857600));
    }

    #[test]
    fn test_filesystem_error_display() {
        let error = FilesystemError::PermissionDenied("/test/file".to_string());
        assert_eq!(error.to_string(), "Permission denied for path: /test/file");
    }

    #[test]
    fn test_event_serde_serialization() {
        let event = FileEvent {
            id: Uuid::new_v4(),
            event_type: FileEventType::Created,
            path: PathBuf::from("/test/image.jpg"),
            timestamp: Utc::now(),
            size: Some(1024),
            mime_type: Some("image/jpeg".to_string()),
            metadata: FileEventMetadata {
                permissions: Some(644),
                is_directory: false,
                is_hidden: false,
                extension: Some("jpg".to_string()),
                blake3_hash: None,
            },
        };

        // Verify serde custom serialization directly (no separate DTO per Phase 1.4 architecture)
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["event_type"], "created");
        assert_eq!(json["path"], "/test/image.jpg");
        assert_eq!(json["size"], 1024);
        assert_eq!(json["mime_type"], "image/jpeg");
        assert!(json["metadata"]["is_directory"].is_boolean());
        assert_eq!(json["metadata"]["extension"], "jpg");

        // Verify roundtrip deserialization
        let deserialized: FileEvent = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized.event_type, FileEventType::Created);
        assert_eq!(deserialized.path, PathBuf::from("/test/image.jpg"));
        assert_eq!(deserialized.size, Some(1024));
    }
}

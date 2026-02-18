use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

/// File processing status for tracking ingestion pipeline
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileProcessingStatus {
    /// File has been discovered but not yet processed
    #[serde(rename = "discovered")]
    Discovered,
    /// File is currently being processed
    #[serde(rename = "processing")]
    Processing,
    /// File has been successfully processed/ingested
    #[serde(rename = "processed")]
    Processed,
    /// An error occurred during processing
    #[serde(rename = "error")]
    Error,
}

impl Default for FileProcessingStatus {
    fn default() -> Self {
        FileProcessingStatus::Discovered
    }
}

/// Supported RAW file formats
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Copy)]
pub enum RawFormat {
    /// Canon RAW 3
    #[serde(rename = "cr3")]
    CR3,
    /// Fujifilm RAW
    #[serde(rename = "raf")]
    RAF,
    /// Sony Alpha RAW
    #[serde(rename = "arw")]
    ARW,
}

impl RawFormat {
    /// Get the file extension for this format
    pub fn extension(&self) -> &'static str {
        match self {
            RawFormat::CR3 => "cr3",
            RawFormat::RAF => "raf",
            RawFormat::ARW => "arw",
        }
    }

    /// Get the MIME type for this format
    pub fn mime_type(&self) -> &'static str {
        match self {
            RawFormat::CR3 => "image/x-canon-cr3",
            RawFormat::RAF => "image/x-fuji-raf",
            RawFormat::ARW => "image/x-sony-arw",
        }
    }

    /// Get the description for this format
    pub fn description(&self) -> &'static str {
        match self {
            RawFormat::CR3 => "Canon RAW 3",
            RawFormat::RAF => "Fujifilm RAW",
            RawFormat::ARW => "Sony Alpha RAW",
        }
    }

    /// Get the magic bytes for this format
    pub fn magic_bytes(&self) -> &'static [u8] {
        match self {
            RawFormat::CR3 => &[0x49, 0x52, 0x42, 0x02],
            RawFormat::RAF => &[0x46, 0x55, 0x4A, 0x49],
            RawFormat::ARW => &[0x00, 0x00, 0x02, 0x00],
        }
    }

    /// Check if bytes match this format's signature
    pub fn matches_signature(&self, bytes: &[u8]) -> bool {
        let signature = self.magic_bytes();
        if bytes.len() < signature.len() {
            return false;
        }
        bytes.starts_with(signature)
    }
}

/// A discovered RAW file candidate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredFile {
    /// Unique identifier for this discovery session
    pub session_id: Uuid,
    /// Full path to the file
    pub path: PathBuf,
    /// File name
    pub filename: String,
    /// Detected RAW format
    pub format: RawFormat,
    /// File size in bytes
    pub size_bytes: u64,
    /// Last modification time
    pub modified_at: DateTime<Utc>,
    /// Whether the file has been processed/ingested (legacy, use status instead)
    pub processed: bool,
    /// BLAKE3 hash (computed during ingestion)
    pub blake3_hash: Option<String>,
    /// Processing status
    pub status: FileProcessingStatus,
    /// Error message if processing failed
    pub error_message: Option<String>,
    /// Timestamp when file was ingested
    pub ingested_at: Option<DateTime<Utc>>,
    /// Database record ID after ingestion
    pub database_id: Option<i64>,
}

impl DiscoveredFile {
    /// Create a new discovered file
    pub fn new(
        session_id: Uuid,
        path: PathBuf,
        format: RawFormat,
        size_bytes: u64,
        modified_at: DateTime<Utc>,
    ) -> Self {
        let filename = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();

        Self {
            session_id,
            path,
            filename,
            format,
            size_bytes,
            modified_at,
            processed: false,
            blake3_hash: None,
            status: FileProcessingStatus::Discovered,
            error_message: None,
            ingested_at: None,
            database_id: None,
        }
    }

    /// Mark this file as processed with its hash and optional database ID
    pub fn mark_processed(&mut self, hash: String, database_id: Option<i64>) {
        self.processed = true;
        self.blake3_hash = Some(hash);
        self.status = FileProcessingStatus::Processed;
        self.error_message = None;
        self.ingested_at = Some(Utc::now());
        self.database_id = database_id;
    }

    /// Mark this file as having an error
    pub fn mark_error(&mut self, error: String) {
        self.error_message = Some(error);
        self.status = FileProcessingStatus::Error;
        self.processed = false;
    }
}

/// Discovery session configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DiscoveryConfig {
    /// Root directory to scan
    pub root_path: PathBuf,
    /// Whether to scan recursively
    pub recursive: bool,
    /// RAW formats to discover
    pub formats: Vec<RawFormat>,
    /// Directories to exclude from scanning
    pub exclude_dirs: Vec<String>,
    /// Maximum depth for recursive scanning (0 = unlimited)
    pub max_depth: Option<usize>,
    /// Maximum number of files to discover (0 = unlimited)
    pub max_files: Option<usize>,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            root_path: PathBuf::from("."),
            recursive: true,
            formats: vec![RawFormat::CR3, RawFormat::RAF, RawFormat::ARW],
            exclude_dirs: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                ".vscode".to_string(),
                ".idea".to_string(),
                "target".to_string(),
                "dist".to_string(),
                "build".to_string(),
            ],
            max_depth: None,
            max_files: None,
        }
    }
}

/// Discovery session status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiscoveryStatus {
    #[serde(rename = "idle")]
    Idle,
    #[serde(rename = "scanning")]
    Scanning,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "stopped")]
    Stopped,
    #[serde(rename = "error")]
    Error(String),
}

impl Default for DiscoveryStatus {
    fn default() -> Self {
        DiscoveryStatus::Idle
    }
}

/// Discovery session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverySession {
    /// Unique session identifier (used as session_id externally)
    pub id: Uuid,
    /// Alias for id, for external API consistency
    #[serde(skip)]
    _session_id_alias: (),
    /// Session configuration
    pub config: DiscoveryConfig,
    /// Current status
    pub status: DiscoveryStatus,
    /// Session start time
    pub started_at: DateTime<Utc>,
    /// Session completion time (if completed)
    pub completed_at: Option<DateTime<Utc>>,
    /// Number of files discovered
    pub files_found: usize,
    /// Number of files successfully processed
    pub files_processed: usize,
    /// Number of files with errors
    pub files_with_errors: usize,
    /// Current scanning directory (for progress reporting)
    pub current_directory: Option<PathBuf>,
    /// Stored progress percentage (0.0-1.0)
    pub progress_percentage: f32,
}

impl DiscoverySession {
    /// Accessor for session_id (alias for id)
    pub fn session_id(&self) -> Uuid {
        self.id
    }

    /// Create a new discovery session
    pub fn new(config: DiscoveryConfig) -> Self {
        Self {
            id: Uuid::new_v4(),
            _session_id_alias: (),
            config,
            status: DiscoveryStatus::Scanning,
            started_at: Utc::now(),
            completed_at: None,
            files_found: 0,
            files_processed: 0,
            files_with_errors: 0,
            current_directory: None,
            progress_percentage: 0.0,
        }
    }

    /// Mark the session as completed
    pub fn complete(&mut self) {
        self.status = DiscoveryStatus::Completed;
        self.completed_at = Some(Utc::now());
        if self.files_found > 0 {
            self.progress_percentage = self.files_processed as f32 / self.files_found as f32;
        } else {
            self.progress_percentage = 1.0;
        }
    }

    /// Alias for complete()
    pub fn mark_completed(&mut self) {
        self.complete();
    }

    /// Mark the session as stopped
    pub fn mark_stopped(&mut self) {
        self.status = DiscoveryStatus::Stopped;
        self.completed_at = Some(Utc::now());
    }

    /// Mark the session as having an error
    pub fn mark_error(&mut self, error: String) {
        self.status = DiscoveryStatus::Error(error);
        self.completed_at = Some(Utc::now());
    }

    /// Update progress counters
    pub fn update_progress(
        &mut self,
        files_found: usize,
        files_processed: usize,
        files_with_errors: usize,
    ) {
        self.files_found = files_found;
        self.files_processed = files_processed;
        self.files_with_errors = files_with_errors;
        if self.files_found > 0 {
            self.progress_percentage = self.files_processed as f32 / self.files_found as f32;
        }
    }

    /// Set the current scanning directory
    pub fn set_current_directory(&mut self, current_directory: Option<PathBuf>) {
        self.current_directory = current_directory;
    }

    /// Get the session duration (None if not completed)
    pub fn duration(&self) -> Option<std::time::Duration> {
        self.completed_at.map(|end| {
            let duration = end - self.started_at;
            duration.to_std().unwrap_or(std::time::Duration::ZERO)
        })
    }
}

/// Ingestion result for a single file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestionResult {
    /// The file that was ingested
    pub file: DiscoveredFile,
    /// Whether ingestion was successful
    pub success: bool,
    /// Database record ID (if successful)
    pub database_id: Option<i64>,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
    /// Any error that occurred
    pub error: Option<String>,
    /// Metadata extracted during ingestion
    pub metadata: Option<IngestionMetadata>,
}

/// Metadata extracted during ingestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestionMetadata {
    /// BLAKE3 hash of the file
    pub blake3_hash: String,
    /// Basic EXIF metadata
    pub exif: BasicExif,
    /// File format details
    pub format_details: FormatDetails,
}

/// Basic EXIF metadata extracted during ingestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasicExif {
    /// Camera make
    pub make: Option<String>,
    /// Camera model
    pub model: Option<String>,
    /// Date/time the photo was taken
    pub date_taken: Option<DateTime<Utc>>,
    /// ISO setting
    pub iso: Option<u16>,
    /// Aperture (f-stop)
    pub aperture: Option<f32>,
    /// Shutter speed
    pub shutter_speed: Option<String>,
    /// Focal length
    pub focal_length: Option<f32>,
    /// Lens model
    pub lens: Option<String>,
}

/// Format-specific details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatDetails {
    /// RAW format
    pub format: RawFormat,
    /// File signature verification result
    pub signature_valid: bool,
    /// Additional format-specific metadata
    pub format_metadata: Option<serde_json::Value>,
}

/// Batch ingestion request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchIngestionRequest {
    /// Session ID for the files to ingest
    pub session_id: Uuid,
    /// Specific file paths to ingest (if empty, ingest all unprocessed files)
    pub file_paths: Vec<PathBuf>,
    /// Whether to skip files that already exist in the database
    pub skip_existing: bool,
    /// Maximum number of files to process in this batch
    pub max_files: Option<usize>,
}

/// Batch ingestion results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchIngestionResult {
    /// Session ID
    pub session_id: Uuid,
    /// Total files requested for ingestion
    pub total_requested: usize,
    /// Successfully ingested files
    pub successful: Vec<IngestionResult>,
    /// Failed ingestions
    pub failed: Vec<IngestionResult>,
    /// Skipped files (already exist)
    pub skipped: Vec<IngestionResult>,
    /// Total processing time in milliseconds
    pub total_processing_time_ms: u64,
    /// Average processing time per file in milliseconds
    pub avg_processing_time_ms: f64,
}

impl BatchIngestionResult {
    /// Create a new batch result
    pub fn new(session_id: Uuid, total_requested: usize) -> Self {
        Self {
            session_id,
            total_requested,
            successful: Vec::new(),
            failed: Vec::new(),
            skipped: Vec::new(),
            total_processing_time_ms: 0,
            avg_processing_time_ms: 0.0,
        }
    }

    /// Add a successful result
    pub fn add_successful(&mut self, result: IngestionResult) {
        self.successful.push(result);
    }

    /// Add a failed result
    pub fn add_failed(&mut self, result: IngestionResult) {
        self.failed.push(result);
    }

    /// Add a skipped result
    pub fn add_skipped(&mut self, result: IngestionResult) {
        self.skipped.push(result);
    }

    /// Calculate statistics
    pub fn finalize(&mut self) {
        let total_processed = self.successful.len() + self.failed.len() + self.skipped.len();
        if total_processed > 0 {
            self.avg_processing_time_ms =
                self.total_processing_time_ms as f64 / total_processed as f64;
        }
    }

    /// Get total files processed
    pub fn total_processed(&self) -> usize {
        self.successful.len() + self.failed.len() + self.skipped.len()
    }

    /// Get success rate as percentage
    pub fn success_rate(&self) -> f64 {
        let total = self.total_processed();
        if total == 0 {
            0.0
        } else {
            (self.successful.len() as f64 / total as f64) * 100.0
        }
    }
}

/// Discovery-specific errors
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum DiscoveryError {
    #[error("IO error: {0}")]
    IoError(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Access denied: {0}")]
    AccessDenied(String),

    #[error("File format not supported: {0}")]
    UnsupportedFormat(String),

    #[error("File signature validation failed: {0}")]
    InvalidSignature(String),

    #[error("Discovery session not found: {0}")]
    SessionNotFound(Uuid),

    #[error("Discovery already in progress")]
    AlreadyInProgress,

    #[error("Configuration error: {0}")]
    ConfigError(String),
}

impl From<std::io::Error> for DiscoveryError {
    fn from(err: std::io::Error) -> Self {
        DiscoveryError::IoError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_raw_format_properties() {
        let format = RawFormat::CR3;
        assert_eq!(format.extension(), "cr3");
        assert_eq!(format.mime_type(), "image/x-canon-cr3");
        assert_eq!(format.description(), "Canon RAW 3");

        let format = RawFormat::RAF;
        assert_eq!(format.extension(), "raf");
        assert_eq!(format.mime_type(), "image/x-fuji-raf");
        assert_eq!(format.description(), "Fujifilm RAW");

        let format = RawFormat::ARW;
        assert_eq!(format.extension(), "arw");
        assert_eq!(format.mime_type(), "image/x-sony-arw");
        assert_eq!(format.description(), "Sony Alpha RAW");
    }

    #[test]
    fn test_raw_format_signature_matching() {
        let cr3_bytes = &[0x49, 0x52, 0x42, 0x02, 0x00];
        let raf_bytes = &[0x46, 0x55, 0x4A, 0x49, 0x00];
        let arw_bytes = &[0x00, 0x00, 0x02, 0x00, 0x53];
        let invalid_bytes = &[0xFF, 0xFF, 0xFF, 0xFF];

        assert!(RawFormat::CR3.matches_signature(cr3_bytes));
        assert!(!RawFormat::CR3.matches_signature(raf_bytes));
        assert!(!RawFormat::CR3.matches_signature(invalid_bytes));

        assert!(RawFormat::RAF.matches_signature(raf_bytes));
        assert!(!RawFormat::RAF.matches_signature(arw_bytes));
        assert!(!RawFormat::RAF.matches_signature(invalid_bytes));

        assert!(RawFormat::ARW.matches_signature(arw_bytes));
        assert!(!RawFormat::ARW.matches_signature(cr3_bytes));
        assert!(!RawFormat::ARW.matches_signature(invalid_bytes));
    }

    #[test]
    fn test_discovered_file_creation() {
        let session_id = Uuid::new_v4();
        let path = PathBuf::from("/test/file.CR3");
        let format = RawFormat::CR3;
        let size = 1024u64;
        let modified = Utc::now();

        let file = DiscoveredFile::new(
            session_id.clone(),
            path.clone(),
            format.clone(),
            size,
            modified,
        );

        assert_eq!(file.session_id, session_id);
        assert_eq!(file.path, path);
        assert_eq!(file.format, format);
        assert_eq!(file.size_bytes, size);
        assert_eq!(file.modified_at, modified);
    }
    #[test]
    fn test_discovered_file_mark_processed() {
        let mut file = DiscoveredFile::new(
            Uuid::new_v4(),
            PathBuf::from("/test/photo.cr3"),
            RawFormat::CR3,
            1024,
            Utc::now(),
        );

        let hash = "abc123".to_string();
        let db_id = 42i64;

        file.mark_processed(hash.clone(), Some(db_id));

        assert_eq!(file.status, FileProcessingStatus::Processed);
        assert_eq!(file.blake3_hash, Some(hash));
        assert_eq!(file.database_id, Some(db_id));
        assert!(file.ingested_at.is_some());
    }

    #[test]
    fn test_discovered_file_mark_error() {
        let mut file = DiscoveredFile::new(
            Uuid::new_v4(),
            PathBuf::from("/test/photo.cr3"),
            RawFormat::CR3,
            1024,
            Utc::now(),
        );

        let error = "Test error".to_string();
        file.mark_error(error.clone());

        assert!(!file.processed);
        assert!(file.blake3_hash.is_none());
        assert_eq!(file.error_message, Some(error));
        assert_eq!(file.status, FileProcessingStatus::Error);
    }

    #[test]
    fn test_discovery_session_creation() {
        let config = DiscoveryConfig::default();
        let session = DiscoverySession::new(config.clone());

        assert_eq!(session.config, config);
        assert!(matches!(session.status, DiscoveryStatus::Scanning));
        assert!(session.completed_at.is_none());
        assert_eq!(session.files_found, 0);
        assert_eq!(session.files_processed, 0);
        assert_eq!(session.files_with_errors, 0);
        assert_eq!(session.progress_percentage, 0.0);
    }

    #[test]
    fn test_discovery_session_progress() {
        let mut session = DiscoverySession::new(DiscoveryConfig::default());

        session.update_progress(50, 45, 5);
        assert_eq!(session.files_found, 50);
        assert_eq!(session.files_processed, 45);
        assert_eq!(session.files_with_errors, 5);
        assert_eq!(session.progress_percentage, 0.9);
    }

    #[test]
    fn test_discovery_session_completion() {
        let mut session = DiscoverySession::new(DiscoveryConfig::default());

        session.complete();
        assert!(matches!(session.status, DiscoveryStatus::Completed));
        assert!(session.completed_at.is_some());
    }

    #[test]
    fn test_discovery_session_duration() {
        let mut session = DiscoverySession::new(DiscoveryConfig::default());

        // Should be None for incomplete session
        assert!(session.duration().is_none());

        session.complete();

        // Should be Some for completed session
        assert!(session.duration().is_some());
        assert!(session.duration().unwrap().as_millis() >= 0);
    }

    #[test]
    fn test_batch_ingestion_result() {
        let session_id = Uuid::new_v4();
        let mut result = BatchIngestionResult::new(session_id, 5);

        assert_eq!(result.session_id, session_id);
        assert_eq!(result.total_requested, 5);
        assert_eq!(result.total_processed(), 0);
        assert_eq!(result.success_rate(), 0.0);

        // Add some results
        result.finalize();
        assert_eq!(result.avg_processing_time_ms, 0.0);
    }

    #[test]
    fn test_discovery_config_default() {
        let config = DiscoveryConfig::default();

        assert!(config.recursive);
        assert_eq!(config.formats.len(), 3);
        assert!(config.formats.contains(&RawFormat::CR3));
        assert!(config.formats.contains(&RawFormat::RAF));
        assert!(config.formats.contains(&RawFormat::ARW));
        assert!(!config.exclude_dirs.is_empty());
        assert!(config.max_depth.is_none());
        assert!(config.max_files.is_none());
    }
}

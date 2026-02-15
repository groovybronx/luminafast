use crate::error::{AppError, AppResult};
use crate::models::discovery::{
    BatchIngestionRequest, BatchIngestionResult, DiscoveredFile, DiscoveryConfig, DiscoverySession,
    IngestionResult,
};
use crate::services::discovery::DiscoveryService;
use crate::services::ingestion::IngestionService;
use log::{debug, error};
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

use std::sync::OnceLock;

/// Global discovery service instance
static DISCOVERY_SERVICE: OnceLock<Arc<DiscoveryService>> = OnceLock::new();

/// Global ingestion service instance
static INGESTION_SERVICE: OnceLock<Arc<IngestionService>> = OnceLock::new();

/// Initialize the discovery services (called from lib.rs)
pub fn initialize_discovery_services() {
    // Services will be initialized lazily when needed
}

/// Get the global discovery service
fn get_discovery_service() -> Arc<DiscoveryService> {
    DISCOVERY_SERVICE
        .get_or_init(|| {
            // Create BLAKE3 service for discovery
            let blake3_service = Arc::new(crate::services::blake3::Blake3Service::new(
                crate::models::hashing::HashConfig::default(),
            ));
            Arc::new(DiscoveryService::new(blake3_service))
        })
        .clone()
}

/// Get the global ingestion service
fn get_ingestion_service() -> Arc<IngestionService> {
    INGESTION_SERVICE
        .get_or_init(|| {
            // Create database connection (std::sync::Mutex for Sync safety)
            let conn = rusqlite::Connection::open_in_memory()
                .expect("Failed to create in-memory database for ingestion");
            let db = Arc::new(std::sync::Mutex::new(conn));

            // Create BLAKE3 service for ingestion
            let blake3_service = Arc::new(crate::services::blake3::Blake3Service::new(
                crate::models::hashing::HashConfig::default(),
            ));
            Arc::new(IngestionService::new(blake3_service, db))
        })
        .clone()
}

/// Start a new discovery session
#[tauri::command]
pub fn start_discovery(config: DiscoveryConfig) -> Result<Uuid, String> {
    match start_discovery_impl(config) {
        Ok(session_id) => Ok(session_id),
        Err(e) => {
            error!("Failed to start discovery: {}", e);
            Err(e.into())
        }
    }
}

fn start_discovery_impl(config: DiscoveryConfig) -> AppResult<Uuid> {
    // Use blocking runtime for async operations
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let session_id = rt.block_on(async {
        get_discovery_service()
            .start_discovery(config)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;
    
    debug!("Started discovery session: {}", session_id);
    Ok(session_id)
}

/// Stop an active discovery session
#[tauri::command]
pub fn stop_discovery(session_id: Uuid) -> Result<(), String> {
    match stop_discovery_impl(session_id) {
        Ok(_) => Ok(()),
        Err(e) => {
            error!("Failed to stop discovery session {}: {}", session_id, e);
            Err(e.into())
        }
    }
}

fn stop_discovery_impl(session_id: Uuid) -> AppResult<()> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    rt.block_on(async {
        get_discovery_service()
            .stop_discovery(session_id)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;
    
    debug!("Stopped discovery session: {}", session_id);
    Ok(())
}

/// Get the status of a discovery session
#[tauri::command]
pub fn get_discovery_status(session_id: Uuid) -> Result<DiscoverySession, String> {
    match get_discovery_status_impl(session_id) {
        Ok(session) => Ok(session),
        Err(e) => {
            error!("Failed to get discovery status for session {}: {}", session_id, e);
            Err(e.into())
        }
    }
}

fn get_discovery_status_impl(session_id: Uuid) -> AppResult<DiscoverySession> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let session = rt.block_on(async {
        get_discovery_service()
            .get_session_status(session_id)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;
    
    debug!("Retrieved discovery status for session: {}", session_id);
    Ok(session)
}

/// Get all discovery sessions
#[tauri::command]
pub fn get_all_discovery_sessions() -> Result<Vec<DiscoverySession>, String> {
    match get_all_discovery_sessions_impl() {
        Ok(sessions) => Ok(sessions),
        Err(e) => {
            error!("Failed to get all discovery sessions: {}", e);
            Err(e.into())
        }
    }
}

fn get_all_discovery_sessions_impl() -> AppResult<Vec<DiscoverySession>> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let sessions = rt.block_on(async {
        get_discovery_service().get_all_sessions().await
    });
    
    debug!("Retrieved {} discovery sessions", sessions.len());
    Ok(sessions)
}

/// Get discovered files for a session
#[tauri::command]
pub fn get_discovered_files(session_id: Uuid) -> Result<Vec<DiscoveredFile>, String> {
    match get_discovered_files_impl(session_id) {
        Ok(files) => Ok(files),
        Err(e) => {
            error!("Failed to get discovered files for session {}: {}", session_id, e);
            Err(e.into())
        }
    }
}

fn get_discovered_files_impl(session_id: Uuid) -> AppResult<Vec<DiscoveredFile>> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let files = rt.block_on(async {
        get_discovery_service()
            .get_session_files(session_id)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;
    
    debug!("Retrieved {} discovered files for session: {}", files.len(), session_id);
    Ok(files)
}

/// Ingest a single discovered file
#[tauri::command]
pub fn ingest_file(file: DiscoveredFile) -> Result<IngestionResult, String> {
    match ingest_file_impl(file) {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to ingest file: {}", e);
            Err(e.into())
        }
    }
}

fn ingest_file_impl(file: DiscoveredFile) -> AppResult<IngestionResult> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let file_path = file.path.display().to_string();
    let result = rt.block_on(async {
        get_ingestion_service()
            .ingest_file(&file)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;
    
    debug!("Ingested file: {}", file_path);
    Ok(result)
}

/// Batch ingest multiple files
#[tauri::command]
pub fn batch_ingest(request: BatchIngestionRequest) -> Result<BatchIngestionResult, String> {
    match batch_ingest_impl(request) {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to batch ingest files: {}", e);
            Err(e.into())
        }
    }
}

fn batch_ingest_impl(request: BatchIngestionRequest) -> AppResult<BatchIngestionResult> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let file_count = request.file_paths.len();
    let result = rt.block_on(async {
        get_ingestion_service()
            .batch_ingest(&request)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;
    
    debug!("Batch ingested {} files", file_count);
    Ok(result)
}

/// Create a discovery configuration from a directory path
#[tauri::command]
pub async fn create_discovery_config(
    root_path: String,
    recursive: Option<bool>,
    max_depth: Option<usize>,
    max_files: Option<usize>,
) -> Result<DiscoveryConfig, String> {
    match create_discovery_config_impl(root_path, recursive, max_depth, max_files).await {
        Ok(config) => Ok(config),
        Err(e) => {
            error!("Failed to create discovery config: {}", e);
            Err(e.into())
        }
    }
}

async fn create_discovery_config_impl(
    root_path: String,
    recursive: Option<bool>,
    max_depth: Option<usize>,
    max_files: Option<usize>,
) -> AppResult<DiscoveryConfig> {
    let path = PathBuf::from(&root_path);

    if !path.exists() {
        return Err(AppError::FileNotFound(format!("Directory does not exist: {}", root_path)));
    }

    let config = DiscoveryConfig {
        root_path: path,
        recursive: recursive.unwrap_or(true),
        formats: vec![],      // Will use default formats
        exclude_dirs: vec![], // Will use default exclusions
        max_depth,
        max_files,
    };

    debug!("Created discovery config for path: {}", root_path);
    Ok(config)
}

/// Get available RAW formats
#[tauri::command]
pub async fn get_supported_formats() -> Result<Vec<String>, String> {
    match get_supported_formats_impl().await {
        Ok(formats) => Ok(formats),
        Err(e) => {
            error!("Failed to get supported formats: {}", e);
            Err(e.into())
        }
    }
}

async fn get_supported_formats_impl() -> AppResult<Vec<String>> {
    let formats = vec![
        "cr3".to_string(), // Canon
        "raf".to_string(), // Fuji
        "arw".to_string(), // Sony
    ];

    debug!("Retrieved {} supported formats", formats.len());
    Ok(formats)
}

/// Validate a directory path for discovery
#[tauri::command]
pub async fn validate_discovery_path(path: String) -> Result<bool, String> {
    match validate_discovery_path_impl(path).await {
        Ok(valid) => Ok(valid),
        Err(e) => {
            error!("Failed to validate discovery path: {}", e);
            Err(e.into())
        }
    }
}

async fn validate_discovery_path_impl(path: String) -> AppResult<bool> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(AppError::FileNotFound(format!("Path does not exist: {}", path)));
    }

    if !path_buf.is_dir() {
        return Err(AppError::InvalidInput(format!("Path is not a directory: {}", path)));
    }

    // Check if we can read the directory
    std::fs::read_dir(&path_buf)
        .map_err(|e| AppError::FileSystem(format!("Cannot read directory: {}", e)))?;

    debug!("Validated discovery path: {}", path);
    Ok(true)
}

/// Get default discovery configuration
#[tauri::command]
pub async fn get_default_discovery_config() -> Result<DiscoveryConfig, String> {
    match get_default_discovery_config_impl().await {
        Ok(config) => Ok(config),
        Err(e) => {
            error!("Failed to get default discovery config: {}", e);
            Err(e.into())
        }
    }
}

async fn get_default_discovery_config_impl() -> AppResult<DiscoveryConfig> {
    let config = DiscoveryConfig::default();
    debug!("Retrieved default discovery config");
    Ok(config)
}

/// Clean up old discovery sessions
#[tauri::command]
pub fn cleanup_discovery_sessions(max_age_hours: u64) -> Result<usize, String> {
    match cleanup_discovery_sessions_impl(max_age_hours) {
        Ok(cleaned) => Ok(cleaned),
        Err(e) => {
            error!("Failed to cleanup discovery sessions: {}", e);
            Err(e.into())
        }
    }
}

fn cleanup_discovery_sessions_impl(max_age_hours: u64) -> AppResult<usize> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let cleaned = rt.block_on(async {
        get_discovery_service()
            .cleanup_old_sessions(max_age_hours)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))
    })?;

    debug!("Cleaned up {} old discovery sessions", cleaned);
    Ok(cleaned)
}

/// Get discovery statistics
#[tauri::command]
pub fn get_discovery_stats(session_id: Uuid) -> Result<DiscoveryStats, String> {
    match get_discovery_stats_impl(session_id) {
        Ok(stats) => Ok(stats),
        Err(e) => {
            error!("Failed to get discovery stats for session {}: {}", session_id, e);
            Err(e.into())
        }
    }
}

fn get_discovery_stats_impl(session_id: Uuid) -> AppResult<DiscoveryStats> {
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| AppError::Internal(format!("Failed to create runtime: {}", e)))?;
    
    let stats = rt.block_on(async {
        // Get session status
        let session = get_discovery_service()
            .get_session_status(session_id)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))?;

        // Get ingestion stats
        let ingestion_stats = get_ingestion_service()
            .get_session_stats(session_id)
            .await
            .map_err(|e| AppError::Discovery(e.to_string()))?;

        let stats = DiscoveryStats {
            session_id,
            status: session.status.clone(),
            files_found: session.files_found,
            files_processed: session.files_processed,
            files_with_errors: session.files_with_errors,
            progress_percentage: session.progress_percentage,
            current_directory: session.current_directory.clone(),
            started_at: session.started_at,
            completed_at: session.completed_at,
            duration: session.duration(),
            ingestion_stats,
        };

        Ok::<DiscoveryStats, AppError>(stats)
    })?;

    debug!("Retrieved discovery stats for session: {}", session_id);
    Ok(stats)
}

/// Combined discovery statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DiscoveryStats {
    pub session_id: Uuid,
    pub status: crate::models::discovery::DiscoveryStatus,
    pub files_found: usize,
    pub files_processed: usize,
    pub files_with_errors: usize,
    pub progress_percentage: f32,
    pub current_directory: Option<PathBuf>,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub duration: Option<std::time::Duration>,
    pub ingestion_stats: crate::services::ingestion::IngestionStats,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::blake3::Blake3Service;
    use crate::services::discovery::DiscoveryService;
    use crate::services::ingestion::IngestionService;
    use std::sync::Arc;
    use tempfile::TempDir;

    fn create_test_state() -> (Arc<DiscoveryService>, Arc<IngestionService>) {
        let blake3_service = Arc::new(Blake3Service::new(
            crate::models::hashing::HashConfig::default(),
        ));
        let discovery_service = Arc::new(DiscoveryService::new(blake3_service.clone()));

        // Create test database
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blake3_hash TEXT NOT NULL,
                filename TEXT NOT NULL,
                extension TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                orientation INTEGER DEFAULT 0,
                file_size_bytes INTEGER,
                captured_at DATETIME,
                folder_id INTEGER
            );
            CREATE TABLE exif_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_id INTEGER NOT NULL,
                iso INTEGER,
                aperture REAL,
                shutter_speed REAL,
                focal_length REAL,
                lens TEXT,
                camera_make TEXT,
                camera_model TEXT,
                gps_lat REAL,
                gps_lon REAL,
                color_space TEXT,
                FOREIGN KEY (image_id) REFERENCES images (id)
            );",
        )
        .unwrap();

        let db = Arc::new(std::sync::Mutex::new(conn));
        let ingestion_service = Arc::new(IngestionService::new(blake3_service, db));

        (discovery_service, ingestion_service)
    }

    #[tokio::test]
    async fn test_create_discovery_config() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_discovery_config(
            temp_dir.path().to_string_lossy().to_string(),
            Some(true),
            Some(5),
            Some(100),
        )
        .await
        .unwrap();

        assert_eq!(config.root_path, temp_dir.path());
        assert!(config.recursive);
        assert_eq!(config.max_depth, Some(5));
        assert_eq!(config.max_files, Some(100));
    }

    #[tokio::test]
    async fn test_validate_discovery_path() {
        let temp_dir = TempDir::new().unwrap();

        // Valid directory
        let result = validate_discovery_path(temp_dir.path().to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Invalid path
        let result = validate_discovery_path("/non/existent/path".to_string()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_supported_formats() {
        let formats = get_supported_formats().await.unwrap();
        assert_eq!(formats.len(), 3);
        assert!(formats.contains(&"cr3".to_string()));
        assert!(formats.contains(&"raf".to_string()));
        assert!(formats.contains(&"arw".to_string()));
    }

    #[tokio::test]
    async fn test_get_default_discovery_config() {
        let config = get_default_discovery_config().await.unwrap();
        assert!(config.recursive);
        assert_eq!(config.formats.len(), 3);
        assert!(!config.exclude_dirs.is_empty());
        assert!(config.max_depth.is_none());
        assert!(config.max_files.is_none());
    }
}

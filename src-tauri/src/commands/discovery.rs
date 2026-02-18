use crate::models::discovery::{
    BatchIngestionRequest, BatchIngestionResult, DiscoveredFile, DiscoveryConfig, DiscoverySession,
    IngestionResult,
};
use crate::services::discovery::DiscoveryService;
use crate::services::ingestion::IngestionService;
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
    // Use blocking runtime for async operations
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        get_discovery_service()
            .start_discovery(config)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Stop an active discovery session
#[tauri::command]
pub fn stop_discovery(session_id: Uuid) -> Result<(), String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        get_discovery_service()
            .stop_discovery(session_id)
            .await
            .map_err(|e| e.to_string())
    })
}

/// Get the status of a discovery session
#[tauri::command]
pub fn get_discovery_status(session_id: Uuid) -> Result<DiscoverySession, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        let session = get_discovery_service()
            .get_session_status(session_id)
            .await
            .map_err(|e| e.to_string())?;

        Ok(session)
    })
}

/// Get all discovery sessions
#[tauri::command]
pub fn get_all_discovery_sessions() -> Result<Vec<DiscoverySession>, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        let sessions = get_discovery_service().get_all_sessions().await;

        Ok(sessions)
    })
}

/// Get discovered files for a session
#[tauri::command]
pub fn get_discovered_files(session_id: Uuid) -> Result<Vec<DiscoveredFile>, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        let files = get_discovery_service()
            .get_session_files(session_id)
            .await
            .map_err(|e| e.to_string())?;

        Ok(files)
    })
}

/// Ingest a single discovered file
#[tauri::command]
pub fn ingest_file(file: DiscoveredFile) -> Result<IngestionResult, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        let result = get_ingestion_service()
            .ingest_file(&file)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result)
    })
}

/// Batch ingest multiple files
#[tauri::command]
pub fn batch_ingest(request: BatchIngestionRequest) -> Result<BatchIngestionResult, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        let result = get_ingestion_service()
            .batch_ingest(&request)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result)
    })
}

/// Create a discovery configuration from a directory path
#[tauri::command]
pub async fn create_discovery_config(
    root_path: String,
    recursive: Option<bool>,
    max_depth: Option<usize>,
    max_files: Option<usize>,
) -> Result<DiscoveryConfig, String> {
    let path = PathBuf::from(&root_path);

    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let config = DiscoveryConfig {
        root_path: path,
        recursive: recursive.unwrap_or(true),
        formats: vec![],      // Will use default formats
        exclude_dirs: vec![], // Will use default exclusions
        max_depth,
        max_files,
    };

    Ok(config)
}

/// Get available RAW formats
#[tauri::command]
pub async fn get_supported_formats() -> Result<Vec<String>, String> {
    let formats = vec![
        "cr3".to_string(), // Canon
        "raf".to_string(), // Fuji
        "arw".to_string(), // Sony
    ];

    Ok(formats)
}

/// Validate a directory path for discovery
#[tauri::command]
pub async fn validate_discovery_path(path: String) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path_buf.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Check if we can read the directory
    match std::fs::read_dir(&path_buf) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Cannot read directory: {}", e)),
    }
}

/// Get default discovery configuration
#[tauri::command]
pub async fn get_default_discovery_config() -> Result<DiscoveryConfig, String> {
    Ok(DiscoveryConfig::default())
}

/// Clean up old discovery sessions
#[tauri::command]
pub fn cleanup_discovery_sessions(max_age_hours: u64) -> Result<usize, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        let cleaned = get_discovery_service()
            .cleanup_old_sessions(max_age_hours)
            .await
            .map_err(|e| e.to_string())?;

        Ok(cleaned)
    })
}

/// Get discovery statistics
#[tauri::command]
pub fn get_discovery_stats(session_id: Uuid) -> Result<DiscoveryStats, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(async {
        // Get session status
        let session = get_discovery_service()
            .get_session_status(session_id)
            .await
            .map_err(|e| e.to_string())?;

        // Get ingestion stats
        let ingestion_stats = get_ingestion_service()
            .get_session_stats(session_id)
            .await
            .map_err(|e| e.to_string())?;

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

        Ok(stats)
    })
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

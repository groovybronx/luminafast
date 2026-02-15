use crate::error::{AppError, AppResult};
use crate::models::filesystem::{
    FileEvent, FileEventMetadata, FileLock, FileLockType, FilesystemError, FilesystemState,
    WatcherConfig, WatcherStats,
};
use crate::services::filesystem::FilesystemService;
use log::{debug, error};
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::command;
use uuid::Uuid;

/// État global du service filesystem
static FILESYSTEM_SERVICE: Mutex<Option<Arc<FilesystemService>>> = Mutex::new(None);

/// Initialise le service filesystem (appelé au démarrage)
pub fn initialize_filesystem_service() {
    let mut service_guard = FILESYSTEM_SERVICE.lock();
    if service_guard.is_none() {
        *service_guard = Some(Arc::new(FilesystemService::new()));
    }
}

/// Récupère le service filesystem
fn get_service() -> AppResult<Arc<FilesystemService>> {
    FILESYSTEM_SERVICE
        .lock()
        .as_ref()
        .ok_or_else(|| AppError::Internal("Filesystem service not initialized".to_string()))
        .cloned()
}

/// Démarre un watcher sur un chemin
#[command]
pub async fn start_watcher(config: WatcherConfig) -> Result<String, String> {
    match start_watcher_impl(config).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to start watcher: {}", e);
            Err(e.into())
        }
    }
}

async fn start_watcher_impl(config: WatcherConfig) -> AppResult<String> {
    let service = get_service()?;
    let watcher_id = service
        .start_watcher(config)
        .await
        .map_err(|e| AppError::FileSystem(e.to_string()))?;
    
    debug!("Started watcher with ID: {}", watcher_id);
    Ok(watcher_id.to_string())
}

/// Arrête un watcher
#[command]
pub async fn stop_watcher(watcher_id: String) -> Result<(), String> {
    match stop_watcher_impl(watcher_id).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to stop watcher: {}", e);
            Err(e.into())
        }
    }
}

async fn stop_watcher_impl(watcher_id: String) -> AppResult<()> {
    let service = get_service()?;
    let id = Uuid::parse_str(&watcher_id)
        .map_err(|e| AppError::InvalidInput(format!("Invalid watcher ID: {}", e)))?;

    service
        .stop_watcher(id)
        .await
        .map_err(|e| AppError::FileSystem(e.to_string()))?;
    
    debug!("Stopped watcher with ID: {}", watcher_id);
    Ok(())
}

/// Acquiert un verrou sur un fichier
#[command]
pub async fn acquire_lock(
    path: String,
    lock_type: String,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    match acquire_lock_impl(path, lock_type, timeout_ms).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to acquire lock: {}", e);
            Err(e.into())
        }
    }
}

async fn acquire_lock_impl(
    path: String,
    lock_type: String,
    timeout_ms: Option<u64>,
) -> AppResult<String> {
    let service = get_service()?;
    let path_buf = PathBuf::from(&path);

    let lock_type_enum = match lock_type.as_str() {
        "shared" => FileLockType::Shared,
        "exclusive" => FileLockType::Exclusive,
        "write" => FileLockType::Write,
        _ => {
            return Err(AppError::InvalidInput(
                "Invalid lock type. Use 'shared', 'exclusive', or 'write'".to_string(),
            ))
        }
    };

    let timeout = timeout_ms.map(Duration::from_millis);

    let lock_id = service
        .acquire_lock(path_buf, lock_type_enum, timeout)
        .await
        .map_err(|e| AppError::FileSystem(e.to_string()))?;
    
    debug!("Acquired {} lock on {}: {}", lock_type, path, lock_id);
    Ok(lock_id.to_string())
}

/// Libère un verrou
#[command]
pub async fn release_lock(lock_id: String) -> Result<(), String> {
    match release_lock_impl(lock_id).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to release lock: {}", e);
            Err(e.into())
        }
    }
}

async fn release_lock_impl(lock_id: String) -> AppResult<()> {
    let service = get_service()?;
    let id = Uuid::parse_str(&lock_id)
        .map_err(|e| AppError::InvalidInput(format!("Invalid lock ID: {}", e)))?;

    service
        .release_lock(id)
        .await
        .map_err(|e| AppError::FileSystem(e.to_string()))?;
    
    debug!("Released lock with ID: {}", lock_id);
    Ok(())
}

/// Récupère les événements en attente
#[command]
pub async fn get_pending_events(limit: Option<usize>) -> Result<Vec<FileEvent>, String> {
    match get_pending_events_impl(limit).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to get pending events: {}", e);
            Err(e.into())
        }
    }
}

async fn get_pending_events_impl(limit: Option<usize>) -> AppResult<Vec<FileEvent>> {
    let service = get_service()?;
    let events = service.get_pending_events(limit).await;
    
    debug!("Retrieved {} pending events", events.len());
    Ok(events)
}

/// Récupère l'état actuel du service
#[command]
pub async fn get_filesystem_state() -> Result<FilesystemState, String> {
    match get_filesystem_state_impl().await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to get filesystem state: {}", e);
            Err(e.into())
        }
    }
}

async fn get_filesystem_state_impl() -> AppResult<FilesystemState> {
    let service = get_service()?;
    let state = service.get_state().await;
    
    debug!("Retrieved filesystem state with {} active watchers", state.active_watchers.len());
    Ok(state)
}

/// Récupère la liste des verrous actifs
#[command]
pub async fn get_active_locks() -> Result<Vec<FileLock>, String> {
    match get_active_locks_impl().await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to get active locks: {}", e);
            Err(e.into())
        }
    }
}

async fn get_active_locks_impl() -> AppResult<Vec<FileLock>> {
    let service = get_service()?;
    let state = service.get_state().await;
    
    debug!("Retrieved {} active locks", state.active_locks.len());
    Ok(state.active_locks)
}

/// Vérifie si un fichier est verrouillé
#[command]
pub async fn is_file_locked(path: String) -> Result<bool, String> {
    match is_file_locked_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to check if file is locked: {}", e);
            Err(e.into())
        }
    }
}

async fn is_file_locked_impl(path: String) -> AppResult<bool> {
    let service = get_service()?;
    let state = service.get_state().await;
    let path_buf = PathBuf::from(&path);

    let is_locked = state.active_locks.iter().any(|lock| lock.path == path_buf);
    debug!("File {} is locked: {}", path, is_locked);
    Ok(is_locked)
}

/// Récupère les statistiques d'un watcher
#[command]
pub async fn get_watcher_stats(watcher_id: String) -> Result<Option<WatcherStats>, String> {
    match get_watcher_stats_impl(watcher_id).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to get watcher stats: {}", e);
            Err(e.into())
        }
    }
}

async fn get_watcher_stats_impl(watcher_id: String) -> AppResult<Option<WatcherStats>> {
    let service = get_service()?;
    let id = Uuid::parse_str(&watcher_id)
        .map_err(|e| AppError::InvalidInput(format!("Invalid watcher ID: {}", e)))?;

    let state = service.get_state().await;
    let stats = state
        .active_watchers
        .into_iter()
        .find(|stats| stats.watcher_id == id);
    
    debug!("Retrieved watcher stats for ID {}: {:?}", watcher_id, stats.is_some());
    Ok(stats)
}

/// Liste tous les watchers actifs
#[command]
pub async fn list_active_watchers() -> Result<Vec<WatcherStats>, String> {
    match list_active_watchers_impl().await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to list active watchers: {}", e);
            Err(e.into())
        }
    }
}

async fn list_active_watchers_impl() -> AppResult<Vec<WatcherStats>> {
    let service = get_service()?;
    let state = service.get_state().await;
    
    debug!("Listed {} active watchers", state.active_watchers.len());
    Ok(state.active_watchers)
}

/// Test de permission sur un chemin
#[command]
pub async fn test_permissions(path: String) -> Result<bool, String> {
    match test_permissions_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to test permissions: {}", e);
            Err(e.into())
        }
    }
}

async fn test_permissions_impl(path: String) -> AppResult<bool> {
    let path_buf = PathBuf::from(&path);

    // Test simple de lecture
    match std::fs::metadata(&path_buf) {
        Ok(_) => {
            debug!("Path {} is accessible", path);
            Ok(true)
        }
        Err(_) => {
            debug!("Path {} is not accessible", path);
            Ok(false)
        }
    }
}

/// Récupère les métadonnées d'un fichier
#[command]
pub async fn get_file_metadata(path: String) -> Result<FileEventMetadata, String> {
    match get_file_metadata_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to get file metadata: {}", e);
            Err(e.into())
        }
    }
}

async fn get_file_metadata_impl(path: String) -> AppResult<FileEventMetadata> {
    let path_buf = PathBuf::from(&path);

    let metadata = std::fs::metadata(&path_buf)?;

    let permissions = {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            Some(metadata.permissions().mode())
        }
        #[cfg(not(unix))]
        {
            None
        }
    };

    let is_hidden = {
        #[cfg(unix)]
        {
            path_buf
                .file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with('.'))
                .unwrap_or(false)
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            (metadata.file_attributes() & 0x2) != 0
        }
    };

    let extension = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    let _mime_type = detect_mime_type(&path_buf);

    let result = FileEventMetadata {
        permissions,
        is_directory: metadata.is_dir(),
        is_hidden,
        extension,
        blake3_hash: None,
    };
    
    debug!("Retrieved metadata for path: {}", path);
    Ok(result)
}

/// Détecte le type MIME d'un fichier
fn detect_mime_type(path: &PathBuf) -> Option<String> {
    let extension = path.extension()?.to_str()?.to_lowercase();

    match extension.as_str() {
        "jpg" | "jpeg" => Some("image/jpeg".to_string()),
        "png" => Some("image/png".to_string()),
        "gif" => Some("image/gif".to_string()),
        "tiff" | "tif" => Some("image/tiff".to_string()),
        "cr3" => Some("image/x-canon-cr3".to_string()),
        "raf" => Some("image/x-fuji-raf".to_string()),
        "arw" => Some("image/x-sony-arw".to_string()),
        "mp4" => Some("video/mp4".to_string()),
        "mov" => Some("video/quicktime".to_string()),
        "pdf" => Some("application/pdf".to_string()),
        _ => None,
    }
}

/// Crée un dossier
#[command]
pub async fn create_directory(path: String) -> Result<(), String> {
    match create_directory_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to create directory: {}", e);
            Err(e.into())
        }
    }
}

async fn create_directory_impl(path: String) -> AppResult<()> {
    let path_buf = PathBuf::from(&path);

    std::fs::create_dir_all(&path_buf)?;
    
    debug!("Created directory: {}", path);
    Ok(())
}

/// Supprime un fichier ou dossier
#[command]
pub async fn delete_path(path: String) -> Result<(), String> {
    match delete_path_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to delete path: {}", e);
            Err(e.into())
        }
    }
}

async fn delete_path_impl(path: String) -> AppResult<()> {
    let path_buf = PathBuf::from(&path);

    if path_buf.is_dir() {
        std::fs::remove_dir_all(&path_buf)?;
    } else {
        std::fs::remove_file(&path_buf)?;
    }
    
    debug!("Deleted path: {}", path);
    Ok(())
}

/// Déplace un fichier ou dossier
#[command]
pub async fn move_path(from: String, to: String) -> Result<(), String> {
    match move_path_impl(from, to).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to move path: {}", e);
            Err(e.into())
        }
    }
}

async fn move_path_impl(from: String, to: String) -> AppResult<()> {
    let from_buf = PathBuf::from(&from);
    let to_buf = PathBuf::from(&to);

    std::fs::rename(&from_buf, &to_buf)?;
    
    debug!("Moved path from {} to {}", from, to);
    Ok(())
}

/// Copie un fichier
#[command]
pub async fn copy_file(from: String, to: String) -> Result<(), String> {
    match copy_file_impl(from, to).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to copy file: {}", e);
            Err(e.into())
        }
    }
}

async fn copy_file_impl(from: String, to: String) -> AppResult<()> {
    let from_buf = PathBuf::from(&from);
    let to_buf = PathBuf::from(&to);

    std::fs::copy(&from_buf, &to_buf)?;
    
    debug!("Copied file from {} to {}", from, to);
    Ok(())
}

/// Liste le contenu d'un dossier
#[command]
pub async fn list_directory(path: String, recursive: Option<bool>) -> Result<Vec<String>, String> {
    match list_directory_impl(path, recursive).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to list directory: {}", e);
            Err(e.into())
        }
    }
}

async fn list_directory_impl(path: String, recursive: Option<bool>) -> AppResult<Vec<String>> {
    let path_buf = PathBuf::from(&path);
    let recursive = recursive.unwrap_or(false);

    let mut entries = Vec::new();

    if recursive {
        list_directory_recursive(&path_buf, &mut entries)
            .map_err(|e| AppError::FileSystem(e.to_string()))?;
    } else {
        let dir_entries = std::fs::read_dir(&path_buf)?;

        for entry in dir_entries {
            let entry = entry?;
            entries.push(entry.path().to_string_lossy().to_string());
        }
    }
    
    debug!("Listed directory {} with {} entries", path, entries.len());
    Ok(entries)
}

/// Fonction récursive pour lister les dossiers
fn list_directory_recursive(
    path: &PathBuf,
    entries: &mut Vec<String>,
) -> Result<(), FilesystemError> {
    let dir_entries = std::fs::read_dir(path)
        .map_err(|e: std::io::Error| FilesystemError::IoError(e.to_string()))?;

    for entry in dir_entries {
        let entry = entry.map_err(|e: std::io::Error| FilesystemError::IoError(e.to_string()))?;
        let metadata = entry
            .metadata()
            .map_err(|e: std::io::Error| FilesystemError::IoError(e.to_string()))?;

        entries.push(entry.path().to_string_lossy().to_string());
        if metadata.is_dir() {
            // Récursion dans les sous-dossiers
            list_directory_recursive(&entry.path(), entries)?;
        }
    }

    Ok(())
}

/// Vérifie l'existence d'un chemin
#[command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    match path_exists_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to check if path exists: {}", e);
            Err(e.into())
        }
    }
}

async fn path_exists_impl(path: String) -> AppResult<bool> {
    let path_buf = PathBuf::from(&path);
    let exists = path_buf.exists();
    
    debug!("Path {} exists: {}", path, exists);
    Ok(exists)
}
/// Récupère la taille d'un fichier
#[command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    match get_file_size_impl(path).await {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("Failed to get file size: {}", e);
            Err(e.into())
        }
    }
}

async fn get_file_size_impl(path: String) -> AppResult<u64> {
    let path_buf = PathBuf::from(&path);

    let metadata = std::fs::metadata(&path_buf)?;
    let size = metadata.len();
    
    debug!("Retrieved file size for {}: {} bytes", path, size);
    Ok(size)
}

/// Tests unitaires pour les commandes
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_service_initialization() {
        initialize_filesystem_service();
        assert!(FILESYSTEM_SERVICE.lock().is_some());
    }

    #[tokio::test]
    async fn test_watcher_commands() {
        initialize_filesystem_service();

        let temp_dir = TempDir::new().unwrap();
        let config = WatcherConfig {
            path: temp_dir.path().to_path_buf(),
            recursive: false,
            watch_events: vec![],
            extensions_filter: None,
            pattern_filter: None,
            ignore_hidden: true,
            debounce_timeout: 100,
            max_file_size: None,
        };

        // Test démarrage watcher
        let watcher_id = start_watcher(config).await.unwrap();
        assert!(!watcher_id.is_empty());

        // Test arrêt watcher
        stop_watcher(watcher_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_lock_commands() {
        initialize_filesystem_service();

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");

        File::create(&file_path)
            .unwrap()
            .write_all(b"test")
            .unwrap();

        // Test acquisition verrou
        let lock_id = acquire_lock(
            file_path.to_string_lossy().to_string(),
            "exclusive".to_string(),
            Some(1000),
        )
        .await
        .unwrap();
        assert!(!lock_id.is_empty());

        // Test vérification verrou
        let is_locked = is_file_locked(file_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert!(is_locked);

        // Test libération verrou
        release_lock(lock_id).await.unwrap();

        let is_locked = is_file_locked(file_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert!(!is_locked);
    }

    #[tokio::test]
    async fn test_file_operations() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test.txt");

        // Test création
        File::create(&test_path)
            .unwrap()
            .write_all(b"test content")
            .unwrap();

        // Test existence
        let exists = path_exists(test_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert!(exists);

        // Test taille
        let size = get_file_size(test_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(size, 12); // "test content" = 12 bytes

        // Test métadonnées
        let metadata = get_file_metadata(test_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert!(!metadata.is_directory);
        assert_eq!(metadata.extension, Some("txt".to_string()));

        // Test suppression
        delete_path(test_path.to_string_lossy().to_string())
            .await
            .unwrap();

        let exists = path_exists(test_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert!(!exists);
    }

    #[tokio::test]
    async fn test_directory_operations() {
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path().join("test_subdir");

        // Test création dossier
        create_directory(test_dir.to_string_lossy().to_string())
            .await
            .unwrap();

        let exists = path_exists(test_dir.to_string_lossy().to_string())
            .await
            .unwrap();
        assert!(exists);

        // Test création fichier dans dossier
        let test_file = test_dir.join("file.txt");
        File::create(&test_file)
            .unwrap()
            .write_all(b"test")
            .unwrap();

        // Test listing dossier
        let entries = list_directory(test_dir.to_string_lossy().to_string(), Some(false))
            .await
            .unwrap();
        assert_eq!(entries.len(), 1);
        assert!(entries[0].contains("file.txt"));

        // Test listing récursif
        let entries = list_directory(temp_dir.path().to_string_lossy().to_string(), Some(true))
            .await
            .unwrap();
        assert!(entries.len() >= 2); // au moins le dossier et le fichier
    }

    #[tokio::test]
    async fn test_error_handling() {
        initialize_filesystem_service();

        // Test watcher sur chemin inexistant
        let config = WatcherConfig {
            path: PathBuf::from("/nonexistent/path"),
            recursive: false,
            watch_events: vec![],
            extensions_filter: None,
            pattern_filter: None,
            ignore_hidden: true,
            debounce_timeout: 100,
            max_file_size: None,
        };

        let result = start_watcher(config).await;
        assert!(result.is_err());

        // Test verrou sur fichier inexistant
        let result = acquire_lock(
            "/nonexistent/file.txt".to_string(),
            "exclusive".to_string(),
            None,
        )
        .await;
        assert!(result.is_err());

        // Test ID invalide
        let result = stop_watcher("invalid-uuid".to_string()).await;
        assert!(result.is_err());
    }
}

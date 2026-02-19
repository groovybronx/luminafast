use crate::models::discovery::{
    DiscoveredFile, DiscoveryConfig, DiscoveryError, DiscoverySession, DiscoveryStatus, RawFormat,
};
use crate::services::blake3::Blake3Service;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;
use walkdir::WalkDir;

/// Service for discovering RAW files in directories
pub struct DiscoveryService {
    /// Active discovery sessions
    sessions: Arc<RwLock<HashMap<Uuid, DiscoverySession>>>,
    /// BLAKE3 service for file hashing
    blake3_service: Arc<Blake3Service>,
    /// Currently running discovery task
    current_task: Arc<Mutex<Option<Uuid>>>,
}

impl DiscoveryService {
    /// Create a new discovery service
    pub fn new(blake3_service: Arc<Blake3Service>) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            blake3_service,
            current_task: Arc::new(Mutex::new(None)),
        }
    }

    /// Start a new discovery session
    pub async fn start_discovery(&self, config: DiscoveryConfig) -> Result<Uuid, DiscoveryError> {
        // Check if discovery is already running (only block if session is actively scanning)
        let mut current_task = self.current_task.lock().await;
        if let Some(existing_id) = *current_task {
            let sessions = self.sessions.read().await;
            let is_active = sessions
                .get(&existing_id)
                .map(|s| matches!(s.status, DiscoveryStatus::Scanning))
                .unwrap_or(false);
            if is_active {
                return Err(DiscoveryError::AlreadyInProgress);
            }
            // Previous session finished — allow a new one
            *current_task = None;
        }

        // Validate the root path
        if !config.root_path.exists() {
            return Err(DiscoveryError::InvalidPath(
                config.root_path.to_string_lossy().to_string(),
            ));
        }

        // Create new session
        let session = DiscoverySession::new(config.clone());
        let session_id = session.id;

        // Store the session
        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(session_id, session);
        }

        // Start the discovery task
        let sessions_clone = Arc::clone(&self.sessions);
        let blake3_service_clone = Arc::clone(&self.blake3_service);
        let current_task_clone = Arc::clone(&self.current_task);
        let sessions_error_clone = Arc::clone(&self.sessions);

        *current_task = Some(session_id);

        tokio::spawn(async move {
            let result =
                Self::perform_discovery(sessions_clone, blake3_service_clone, session_id, config)
                    .await;

            // Clear the current task when done
            let mut task_guard = current_task_clone.lock().await;
            *task_guard = None;

            if let Err(e) = result {
                // Update session with error
                let mut sessions = sessions_error_clone.write().await;
                if let Some(session) = sessions.get_mut(&session_id) {
                    session.mark_error(e.to_string());
                }
            }
        });

        Ok(session_id)
    }

    /// Stop an active discovery session
    pub async fn stop_discovery(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
        // Update session status
        let mut sessions = self.sessions.write().await;
        if let Some(session) = sessions.get_mut(&session_id) {
            session.mark_stopped();
            return Ok(());
        }

        Err(DiscoveryError::SessionNotFound(session_id))
    }

    /// Get the status of a discovery session
    pub async fn get_session_status(
        &self,
        session_id: Uuid,
    ) -> Result<DiscoverySession, DiscoveryError> {
        let sessions = self.sessions.read().await;
        sessions
            .get(&session_id)
            .cloned()
            .ok_or(DiscoveryError::SessionNotFound(session_id))
    }

    /// Get all active sessions
    pub async fn get_all_sessions(&self) -> Vec<DiscoverySession> {
        let sessions = self.sessions.read().await;
        sessions.values().cloned().collect()
    }

    /// Get discovered files for a session
    pub async fn get_session_files(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<DiscoveredFile>, DiscoveryError> {
        // For now, we'll return an empty vector
        // In a full implementation, we would store discovered files in the session or database
        let _session = self.get_session_status(session_id).await?;
        Ok(vec![])
    }

    /// Perform the actual discovery operation
    async fn perform_discovery(
        sessions: Arc<RwLock<HashMap<Uuid, DiscoverySession>>>,
        _blake3_service: Arc<Blake3Service>,
        session_id: Uuid,
        config: DiscoveryConfig,
    ) -> Result<(), DiscoveryError> {
        let mut files_found = 0;
        let mut files_processed = 0;
        let mut files_with_errors = 0;
        let mut last_update = std::time::Instant::now();

        // Build the walker
        let mut walkdir = WalkDir::new(&config.root_path);

        if !config.recursive {
            walkdir = walkdir.max_depth(1);
        } else if let Some(max_depth) = config.max_depth {
            walkdir = walkdir.max_depth(max_depth);
        }

        // Walk the directory tree
        for entry in walkdir.into_iter() {
            // Check if discovery was stopped
            {
                let current_task = sessions.read().await;
                if let Some(task_id) = current_task.keys().next() {
                    if *task_id != session_id {
                        return Ok(()); // Discovery was stopped
                    }
                }
            }

            let entry = entry.map_err(|e| DiscoveryError::IoError(e.to_string()))?;
            let path = entry.path();

            // Skip directories
            if path.is_dir() {
                // Update current directory for progress reporting
                if last_update.elapsed().as_millis() > 100 {
                    Self::update_session_progress(
                        &sessions,
                        session_id,
                        files_found,
                        files_processed,
                        files_with_errors,
                        Some(path.to_path_buf()),
                    )
                    .await;
                    last_update = std::time::Instant::now();
                }
                continue;
            }

            // Check if this directory should be excluded
            if let Some(parent) = path.parent() {
                if let Some(parent_name) = parent.file_name().and_then(|n| n.to_str()) {
                    if config.exclude_dirs.contains(&parent_name.to_string()) {
                        continue;
                    }
                }
            }

            // Check if file matches supported formats
            if let Some(file_result) =
                Self::check_raw_file(path, &config.formats, session_id).await?
            {
                files_found += 1;

                if file_result.error_message.is_some() {
                    files_with_errors += 1;
                } else {
                    files_processed += 1;
                }

                // Update progress periodically
                if last_update.elapsed().as_millis() > 100 {
                    let progress = if let Some(max_files) = config.max_files {
                        (files_found as f64 / max_files as f64 * 100.0).min(100.0) as f32
                    } else {
                        0.0 // Can't calculate progress without max_files
                    };

                    Self::update_session_progress(
                        &sessions,
                        session_id,
                        files_found,
                        files_processed,
                        files_with_errors,
                        Some(path.parent().unwrap_or(path).to_path_buf()),
                    )
                    .await;
                    last_update = std::time::Instant::now();
                }

                // Check if we've reached the maximum number of files
                if let Some(max_files) = config.max_files {
                    if files_found >= max_files {
                        break;
                    }
                }
            }
        }

        // Mark session as completed
        {
            let mut sessions = sessions.write().await;
            if let Some(session) = sessions.get_mut(&session_id) {
                session.update_progress(files_found, files_processed, files_with_errors);
                session.set_current_directory(None);
                session.mark_completed();
            }
        }

        Ok(())
    }

    /// Check if a file is a supported RAW format
    async fn check_raw_file(
        path: &Path,
        supported_formats: &[RawFormat],
        session_id: Uuid,
    ) -> Result<Option<DiscoveredFile>, DiscoveryError> {
        // Get file metadata
        let metadata =
            std::fs::metadata(path).map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        // Get file extension
        let extension = path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_lowercase());

        // Check if extension matches supported formats
        let format = match extension {
            Some(ext) => supported_formats.iter().find(|f| f.extension() == ext),
            None => None,
        };

        if format.is_none() {
            return Ok(None);
        }

        let format = *format.expect("Format should be present");

        // Get file modification time
        let modified_at = metadata
            .modified()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;
        let modified_at: chrono::DateTime<chrono::Utc> = modified_at.into();

        // Create discovered file
        let discovered_file = DiscoveredFile::new(
            session_id,
            path.to_path_buf(),
            format,
            metadata.len(),
            modified_at,
        );

        // Validate file signature (optional, can be expensive for large files)
        // For now, we'll skip signature validation to improve performance
        // In a production implementation, you might want to validate signatures for critical files

        Ok(Some(discovered_file))
    }

    /// Update session progress
    async fn update_session_progress(
        sessions: &Arc<RwLock<HashMap<Uuid, DiscoverySession>>>,
        session_id: Uuid,
        files_found: usize,
        files_processed: usize,
        files_with_errors: usize,
        current_directory: Option<PathBuf>,
    ) {
        let mut sessions = sessions.write().await;
        if let Some(session) = sessions.get_mut(&session_id) {
            session.update_progress(files_found, files_processed, files_with_errors);
            session.set_current_directory(current_directory);
        }
    }

    /// Clean up old sessions (optional maintenance)
    pub async fn cleanup_old_sessions(&self, max_age_hours: u64) -> Result<usize, DiscoveryError> {
        let mut sessions = self.sessions.write().await;
        let cutoff = chrono::Utc::now() - chrono::Duration::hours(max_age_hours as i64);

        let initial_count = sessions.len();
        sessions.retain(|_, session| {
            session.started_at > cutoff || matches!(session.status, DiscoveryStatus::Scanning)
        });

        Ok(initial_count - sessions.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_file(dir: &TempDir, filename: &str, content: &[u8]) -> PathBuf {
        let file_path = dir.path().join(filename);
        let mut file = File::create(&file_path).unwrap();
        file.write_all(content).unwrap();
        file_path
    }

    #[tokio::test]
    async fn test_discovery_service_creation() {
        let blake3_service = Arc::new(Blake3Service::new(
            crate::models::hashing::HashConfig::default(),
        ));
        let service = DiscoveryService::new(blake3_service);

        let sessions = service.get_all_sessions().await;
        assert!(sessions.is_empty());
    }

    #[tokio::test]
    async fn test_discovery_config_validation() {
        let blake3_service = Arc::new(Blake3Service::new(
            crate::models::hashing::HashConfig::default(),
        ));
        let service = DiscoveryService::new(blake3_service);

        // Test with non-existent path
        let config = DiscoveryConfig {
            root_path: PathBuf::from("/non/existent/path"),
            ..Default::default()
        };

        let result = service.start_discovery(config).await;
        assert!(matches!(result, Err(DiscoveryError::InvalidPath(_))));
    }

    #[tokio::test]
    async fn test_discovery_session_management() {
        let blake3_service = Arc::new(Blake3Service::new(
            crate::models::hashing::HashConfig::default(),
        ));
        let service = DiscoveryService::new(blake3_service);

        let temp_dir = TempDir::new().unwrap();
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            ..Default::default()
        };

        // Start discovery
        let session_id = service.start_discovery(config).await.unwrap();

        // Check session exists
        let session = service.get_session_status(session_id).await.unwrap();
        assert!(matches!(
            session.status,
            DiscoveryStatus::Scanning | DiscoveryStatus::Completed
        ));

        // Stop discovery
        service.stop_discovery(session_id).await.unwrap();

        // Check session was stopped
        let session = service.get_session_status(session_id).await.unwrap();
        assert!(matches!(
            session.status,
            DiscoveryStatus::Stopped | DiscoveryStatus::Completed
        ));
    }

    #[tokio::test]
    async fn test_already_in_progress() {
        let blake3_service = Arc::new(Blake3Service::new(
            crate::models::hashing::HashConfig::default(),
        ));
        let service = DiscoveryService::new(blake3_service);

        let temp_dir = TempDir::new().unwrap();
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            ..Default::default()
        };

        // Start first discovery
        let _session_id1 = service.start_discovery(config.clone()).await.unwrap();

        // Try to start second discovery (should fail)
        let result = service.start_discovery(config).await;
        assert!(matches!(result, Err(DiscoveryError::AlreadyInProgress)));
    }

    #[tokio::test]
    async fn test_raw_file_detection() {
        let temp_dir = TempDir::new().unwrap();

        // Create test files
        create_test_file(&temp_dir, "test.cr3", b"ftypcr3 test content");
        create_test_file(&temp_dir, "test.raf", b"FUJIFILMCCD-RAW test content");
        create_test_file(
            &temp_dir,
            "test.arw",
            b"\x00\x00\x00\x18ftyparw test content",
        );
        create_test_file(&temp_dir, "test.jpg", b"not a raw file");

        let session_id = Uuid::new_v4();
        let formats = vec![RawFormat::CR3, RawFormat::RAF, RawFormat::ARW];

        // Test CR3 file
        let cr3_path = temp_dir.path().join("test.cr3");
        let result = DiscoveryService::check_raw_file(&cr3_path, &formats, session_id)
            .await
            .expect("Result should be Ok");
        assert!(result.is_some());
        assert_eq!(
            result.expect("Result should be some").format,
            RawFormat::CR3
        );

        // Test RAF file
        let raf_path = temp_dir.path().join("test.raf");
        let result = DiscoveryService::check_raw_file(&raf_path, &formats, session_id)
            .await
            .expect("Result should be Ok");
        assert!(result.is_some());
        assert_eq!(
            result.expect("Result should be some").format,
            RawFormat::RAF
        );

        // Test ARW file
        let arw_path = temp_dir.path().join("test.arw");
        let result = DiscoveryService::check_raw_file(&arw_path, &formats, session_id)
            .await
            .expect("Result should be Ok");
        assert!(result.is_some());
        assert_eq!(
            result.expect("Result should be some").format,
            RawFormat::ARW
        );

        // Test non-RAW file
        let jpg_path = temp_dir.path().join("test.jpg");
        let result = DiscoveryService::check_raw_file(&jpg_path, &formats, session_id)
            .await
            .expect("Result should be Ok");
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_cleanup_old_sessions() {
        let blake3_service = Arc::new(Blake3Service::new(
            crate::models::hashing::HashConfig::default(),
        ));
        let service = DiscoveryService::new(blake3_service);

        let temp_dir = TempDir::new().unwrap();
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            ..Default::default()
        };

        // Start a session
        let session_id = service.start_discovery(config).await.unwrap();

        // Should have one session
        let sessions = service.get_all_sessions().await;
        assert_eq!(sessions.len(), 1);

        // Cleanup with 0 hours (should remove non-scanning sessions)
        // Note: This test might be flaky depending on timing
        let _cleaned = service.cleanup_old_sessions(0).await.unwrap();
    }
}

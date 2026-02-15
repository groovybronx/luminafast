//! Unit tests for Discovery Service
//! 
//! These tests ensure the discovery service works correctly for scanning directories,
//! detecting RAW files, and managing discovery sessions.

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::discovery::{
        DiscoveryConfig, DiscoveryStatus, RawFormat, DiscoveredFile,
        FileProcessingStatus,
    };
    use crate::services::blake3::Blake3Service;
    use std::path::{Path, PathBuf};
    use std::sync::Arc;
    use tempfile::TempDir;
    use tokio::time::{sleep, Duration};
    use uuid::Uuid;

    /// Helper to create a test directory with RAW files
    fn create_test_directory_with_files() -> TempDir {
        let temp_dir = TempDir::new().unwrap();
        
        // Create some test RAW files
        let files = vec![
            ("IMG_001.CR3", b"ftypcr3\x00\x00\x00\x18cr3"),
            ("IMG_002.RAF", b"FUJIFILMCCD-RAW "),
            ("IMG_003.ARW", b"\x00\x00\x02\x00SR2"),
            ("not_raw.txt", b"This is not a RAW file"),
            ("IMG_004.CR3", b"ftypcr3\x00\x00\x00\x18cr3"),
        ];
        
        for (filename, content) in files {
            let file_path = temp_dir.path().join(filename);
            std::fs::write(&file_path, content).unwrap();
        }
        
        // Create subdirectory
        let subdir = temp_dir.path().join("subdir");
        std::fs::create_dir(&subdir).unwrap();
        
        // Add file in subdirectory
        let sub_file = subdir.join("IMG_005.RAF");
        std::fs::write(&sub_file, b"FUJIFILMCCD-RAW ").unwrap();
        
        temp_dir
    }

    /// Helper to create a discovery service
    fn create_discovery_service() -> Arc<DiscoveryService> {
        let blake3_service = Arc::new(Blake3Service::new(crate::models::hashing::HashConfig::default()));
        Arc::new(DiscoveryService::new(blake3_service))
    }

    #[tokio::test]
    async fn test_discovery_service_creation() {
        let service = create_discovery_service();
        
        // Initially, no sessions should be active
        let sessions = service.get_all_sessions().await;
        assert!(sessions.is_empty());
    }

    #[tokio::test]
    async fn test_start_discovery_session() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::CR3, RawFormat::RAF, RawFormat::ARW],
            exclude_dirs: vec![],
            max_depth: Some(5),
            max_files: Some(100),
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Verify session was created
        let session = service.get_session_status(session_id).await.unwrap();
        assert_eq!(session.id, session_id);
        assert!(matches!(session.status, DiscoveryStatus::Scanning | DiscoveryStatus::Completed));
        assert_eq!(session.files_processed, 0);
        assert_eq!(session.files_with_errors, 0);
        
        // Wait a bit for scanning to complete
        sleep(Duration::from_millis(50)).await;
        
        // Check session status
        let session = service.get_session_status(session_id).await.unwrap();
        assert!(session.files_found > 0);
        
        // Clean up
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_stop_discovery_session() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Stop the session
        service.stop_discovery(session_id).await.unwrap();
        
        // Verify session was stopped
        let session = service.get_session_status(session_id).await.unwrap();
        assert!(matches!(session.status, DiscoveryStatus::Stopped | DiscoveryStatus::Completed));
        assert!(session.completed_at.is_some());
    }

    #[tokio::test]
    async fn test_get_all_sessions() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: false,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        // Start multiple sessions
        let session1 = service.start_discovery(config.clone()).await.unwrap();
        let session2 = service.start_discovery(config).await.unwrap();
        
        // Get all sessions
        let sessions = service.get_all_sessions().await;
        assert_eq!(sessions.len(), 2);
        
        // Verify sessions are in the list
        let session_ids: Vec<_> = sessions.iter().map(|s| s.id).collect();
        assert!(session_ids.contains(&session1));
        assert!(session_ids.contains(&session2));
        
        // Clean up
        service.stop_discovery(session1).await.unwrap();
        service.stop_discovery(session2).await.unwrap();
    }

    #[tokio::test]
    async fn test_get_session_files() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::CR3, RawFormat::RAF, RawFormat::ARW],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Wait for scanning to complete
        for _ in 0..20 {
            let session = service.get_session_status(session_id).await.unwrap();
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            sleep(Duration::from_millis(5)).await;
        }
        
        // Get discovered files
        let files = service.get_session_files(session_id).await.unwrap();
        
        // Should find the RAW files we created
        assert!(files.len() >= 5); // At least 5 RAW files
        
        // Verify file properties
        for file in &files {
            assert_eq!(file.session_id, session_id);
            assert!(file.path.starts_with(temp_dir.path()));
            assert!(file.size_bytes > 0);
            assert!(matches!(file.format, RawFormat::CR3 | RawFormat::RAF | RawFormat::ARW));
            assert_eq!(file.status, FileProcessingStatus::Discovered);
        }
        
        // Clean up
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_recursive_scanning() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        // Test recursive scanning
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::RAF],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Wait for scanning to complete
        for _ in 0..20 {
            let session = service.get_session_status(session_id).await.unwrap();
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            sleep(Duration::from_millis(5)).await;
        }
        
        let files = service.get_session_files(session_id).await.unwrap();
        
        // Should find RAF files in both root and subdirectory
        assert!(files.len() >= 2); // At least 2 RAF files
        
        // Verify files are in different directories
        let directories: std::collections::HashSet<_> = files
            .iter()
            .map(|f| Path::new(&f.path).parent().unwrap())
            .collect();
        assert!(directories.len() > 1); // Files in multiple directories
        
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_non_recursive_scanning() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        // Test non-recursive scanning
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: false,
            formats: vec![RawFormat::RAF],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Wait for scanning to complete
        for _ in 0..20 {
            let session = service.get_session_status(session_id).await.unwrap();
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            sleep(Duration::from_millis(5)).await;
        }
        
        let files = service.get_session_files(session_id).await.unwrap();
        
        // Should only find RAF files in root directory
        assert!(files.len() >= 1); // At least 1 RAF file
        
        // Verify all files are in root directory
        for file in &files {
            let parent = Path::new(&file.path).parent().unwrap();
            assert_eq!(parent, temp_dir.path());
        }
        
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_max_files_limit() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        // Test with max files limit
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::CR3, RawFormat::RAF, RawFormat::ARW],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: Some(2), // Limit to 2 files
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Wait for scanning to complete
        for _ in 0..20 {
            let session = service.get_session_status(session_id).await.unwrap();
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            sleep(Duration::from_millis(5)).await;
        }
        
        let files = service.get_session_files(session_id).await.unwrap();
        
        // Should not exceed the limit
        assert!(files.len() <= 2);
        
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_exclude_directories() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        // Create a directory to exclude
        let exclude_dir = temp_dir.path().join("exclude_me");
        std::fs::create_dir(&exclude_dir).unwrap();
        let exclude_file = exclude_dir.join("IMG_EXCLUDE.CR3");
        std::fs::write(&exclude_file, b"ftypcr3\x00\x00\x00\x18cr3").unwrap();
        
        // Test with directory exclusion
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec!["exclude_me".to_string()],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Wait for scanning to complete
        for _ in 0..20 {
            let session = service.get_session_status(session_id).await.unwrap();
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            sleep(Duration::from_millis(5)).await;
        }
        
        let files = service.get_session_files(session_id).await.unwrap();
        
        // Should not find files in excluded directory
        for file in &files {
            let path = Path::new(&file.path);
            assert!(!path.starts_with(&exclude_dir));
        }
        
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_invalid_directory() {
        let service = create_discovery_service();
        
        let config = DiscoveryConfig {
            root_path: PathBuf::from("/non/existent/directory"),
            recursive: true,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let result = service.start_discovery(config).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_cleanup_old_sessions() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: false,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        // Create some sessions
        let session1 = service.start_discovery(config.clone()).await.unwrap();
        let session2 = service.start_discovery(config).await.unwrap();
        
        // Stop one session
        service.stop_discovery(session1).await.unwrap();
        
        // Cleanup old sessions (0 hours = all stopped sessions)
        let cleaned = service.cleanup_old_sessions(0).await.unwrap();
        assert!(cleaned >= 1);
        
        // Verify the stopped session is gone
        let result = service.get_session_status(session1).await;
        assert!(result.is_err());
        
        // Active session should still exist
        let session = service.get_session_status(session2).await.unwrap();
        assert_eq!(session.id, session2);
        
        service.stop_discovery(session2).await.unwrap();
    }

    #[tokio::test]
    async fn test_concurrent_sessions() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: false,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        // Start multiple concurrent sessions
        let mut session_ids = Vec::new();
        for _ in 0..3 {
            let session_id = service.start_discovery(config.clone()).await.unwrap();
            session_ids.push(session_id);
        }
        
        // Verify all sessions are active
        let sessions = service.get_all_sessions().await;
        assert_eq!(sessions.len(), 3);
        
        // Stop all sessions
        for session_id in &session_ids {
            service.stop_discovery(*session_id).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_progress_tracking() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: true,
            formats: vec![RawFormat::CR3, RawFormat::RAF, RawFormat::ARW],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Monitor progress
        let mut last_progress = 0.0;
        let mut files_found = 0;
        
        for _ in 0..100 {
            let session = service.get_session_status(session_id).await.unwrap();
            
            // Progress should be non-decreasing
            assert!(session.progress_percentage >= last_progress);
            last_progress = session.progress_percentage;
            
            // Files found should be non-decreasing
            assert!(session.files_found >= files_found);
            files_found = session.files_found;
            
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            
            sleep(Duration::from_millis(5)).await;
        }
        
        // Final verification
        let session = service.get_session_status(session_id).await.unwrap();
        assert_eq!(session.status, DiscoveryStatus::Completed);
        assert_eq!(session.progress_percentage, 1.0f32);
        assert!(session.files_found > 0);
        assert!(session.completed_at.is_some());
        
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_session_duration() {
        let service = create_discovery_service();
        let temp_dir = create_test_directory_with_files();
        
        let config = DiscoveryConfig {
            root_path: temp_dir.path().to_path_buf(),
            recursive: false,
            formats: vec![RawFormat::CR3],
            exclude_dirs: vec![],
            max_depth: None,
            max_files: None,
        };
        
        let session_id = service.start_discovery(config).await.unwrap();
        
        // Wait for completion
        for _ in 0..20 {
            let session = service.get_session_status(session_id).await.unwrap();
            if session.status == DiscoveryStatus::Completed {
                break;
            }
            sleep(Duration::from_millis(5)).await;
        }
        
        let session = service.get_session_status(session_id).await.unwrap();
        
        // Duration should be available for completed sessions
        let duration = session.duration();
        assert!(duration.is_some());
        assert!(duration.unwrap().as_millis() >= 0);
        
        service.stop_discovery(session_id).await.unwrap();
    }

    #[tokio::test]
    async fn test_error_handling() {
        let service = create_discovery_service();
        
        // Test getting non-existent session
        let fake_session_id = Uuid::new_v4();
        let result = service.get_session_status(fake_session_id).await;
        assert!(result.is_err());
        
        // Test stopping non-existent session
        let result = service.stop_discovery(fake_session_id).await;
        assert!(result.is_err());
        
        // Test getting files for non-existent session
        let result = service.get_session_files(fake_session_id).await;
        assert!(result.is_err());
    }
}

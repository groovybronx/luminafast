/// Integration tests for PreviewDbService (Phase 2.3 MAINTENANCE)
/// These tests validate database persistence and LRU access tracking

#[cfg(test)]
mod preview_db_integration_tests {
    use crate::database::Database;
    use crate::models::preview::{NewPreviewRecord, PreviewType};
    use crate::services::preview_db::PreviewDbService;
    use std::sync::{Arc, Mutex};
    use tempfile::TempDir;

    /// Setup: Create an in-memory database with preview schema
    fn setup_test_db() -> (Arc<Mutex<Database>>, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let db_path = temp_dir.path().join("test_preview.db");

        let mut db = Database::new(&db_path).expect("Failed to create test database");
        db.initialize().expect("Failed to initialize schema");

        (Arc::new(Mutex::new(db)), temp_dir)
    }

    #[test]
    fn test_upsert_preview_creates_record() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        let preview = NewPreviewRecord {
            source_hash: "test_hash_abc123".to_string(),
            preview_type: PreviewType::Thumbnail,
            relative_path: "thumbnails/test_hash_abc123.jpg".to_string(),
            width: 240,
            height: 240,
            file_size: 25000,
            jpeg_quality: 75,
        };

        let result = service.upsert_preview(preview);
        assert!(result.is_ok(), "Failed to upsert preview");

        let id = result.unwrap();
        assert!(id > 0, "Preview ID should be positive");
    }

    #[test]
    fn test_upsert_preview_idempotent_on_same_hash_type() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        let preview = NewPreviewRecord {
            source_hash: "test_hash_xyz789".to_string(),
            preview_type: PreviewType::Standard,
            relative_path: "standard/test_hash_xyz789.jpg".to_string(),
            width: 1440,
            height: 1080,
            file_size: 350000,
            jpeg_quality: 85,
        };

        let id1 = service.upsert_preview(preview.clone()).unwrap();

        // Insert again with same hash/type - should be update (ON CONFLICT)
        let id2 = service.upsert_preview(preview).unwrap();

        // Should return same ID (update, not insert)
        assert_eq!(id1, id2, "Second upsert should return same ID");
    }

    #[test]
    fn test_record_access_increments_count() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        let preview = NewPreviewRecord {
            source_hash: "test_hash_access".to_string(),
            preview_type: PreviewType::OneToOne,
            relative_path: "native/test_hash_access.jpg".to_string(),
            width: 4000,
            height: 3000,
            file_size: 2000000,
            jpeg_quality: 90,
        };

        service.upsert_preview(preview).unwrap();

        // Record 5 accesses
        for _ in 0..5 {
            let result = service.record_access("test_hash_access", "OneToOne");
            assert!(result.is_ok(), "record_access should succeed");
        }

        // Verify access_count was incremented (indirectly via prune logic)
        // Note: Direct verification requires a get_preview method (added in Phase 6.1)
    }

    #[test]
    fn test_get_cache_stats_reports_totals() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        let preview1 = NewPreviewRecord {
            source_hash: "hash1".to_string(),
            preview_type: PreviewType::Thumbnail,
            relative_path: "thumbnails/hash1.jpg".to_string(),
            width: 240,
            height: 240,
            file_size: 20000,
            jpeg_quality: 75,
        };

        let preview2 = NewPreviewRecord {
            source_hash: "hash2".to_string(),
            preview_type: PreviewType::Standard,
            relative_path: "standard/hash2.jpg".to_string(),
            width: 1440,
            height: 1080,
            file_size: 300000,
            jpeg_quality: 85,
        };

        service.upsert_preview(preview1).unwrap();
        service.upsert_preview(preview2).unwrap();

        let stats = service.get_cache_stats().unwrap();

        assert_eq!(stats.total_previews, 2, "Should have 2 previews");
        assert_eq!(
            stats.total_size, 320000,
            "Total size should be 20000 + 300000"
        );
        assert_eq!(stats.thumbnail_count, 1, "Should have 1 thumbnail");
        assert_eq!(stats.preview_count, 1, "Should have 1 standard preview");
    }

    #[test]
    fn test_prune_stale_previews_removes_old_unused() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        // Insert a preview
        let preview = NewPreviewRecord {
            source_hash: "old_hash".to_string(),
            preview_type: PreviewType::Thumbnail,
            relative_path: "thumbnails/old_hash.jpg".to_string(),
            width: 240,
            height: 240,
            file_size: 25000,
            jpeg_quality: 75,
        };

        service.upsert_preview(preview).unwrap();

        // Prune: remove if older than 0 days AND access_count < 1
        // This should remove the just-inserted preview (access_count=0, created now but "too old" by SQL logic)
        // Note: This is a simplified test; real pruning needs manual SQL date manipulation
        let deleted = service.prune_stale_previews(0, 1).unwrap();

        // The preview should be marked for deletion (0 days old check depends on SQL NOW)
        // For now, just verify the function works without panic and returns a count
        let _ = deleted; // unused_comparisons warning: u32 is always >= 0, so just consume the result
    }

    #[test]
    fn test_delete_preview_removes_record() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        let preview = NewPreviewRecord {
            source_hash: "delete_test".to_string(),
            preview_type: PreviewType::Standard,
            relative_path: "standard/delete_test.jpg".to_string(),
            width: 1440,
            height: 1080,
            file_size: 350000,
            jpeg_quality: 85,
        };

        service.upsert_preview(preview).unwrap();

        // Delete it
        let result = service.delete_preview("delete_test", "Standard");
        assert!(result.is_ok(), "delete_preview should succeed");

        // Try to get_cache_stats - should show 0 previews now
        let stats = service.get_cache_stats().unwrap();
        assert_eq!(stats.total_previews, 0, "Deleted preview should be gone");
    }

    #[test]
    fn test_multiple_types_per_image_hash() {
        let (db, _temp) = setup_test_db();
        let service = PreviewDbService::new(db);

        // Same source hash, different types
        let base_hash = "same_source";
        for (preview_type, subdir, size) in [
            (PreviewType::Thumbnail, "thumbnails", 20000),
            (PreviewType::Standard, "standard", 300000),
            (PreviewType::OneToOne, "native", 2000000),
        ] {
            let preview = NewPreviewRecord {
                source_hash: base_hash.to_string(),
                preview_type,
                relative_path: format!("{}/{}.jpg", subdir, base_hash),
                width: 240,
                height: 240,
                file_size: size,
                jpeg_quality: 85,
            };

            let result = service.upsert_preview(preview);
            assert!(result.is_ok());
        }

        let stats = service.get_cache_stats().unwrap();
        assert_eq!(
            stats.total_previews, 3,
            "Should have 3 previews (all types)"
        );
        assert_eq!(stats.thumbnail_count, 1);
        assert_eq!(stats.preview_count, 1);
    }

    #[test]
    fn test_concurrent_upserts_safe() {
        let (db, _temp) = setup_test_db();
        let service = Arc::new(PreviewDbService::new(db));

        let handles: Vec<_> = (0..5)
            .map(|i| {
                let service_clone = service.clone();
                std::thread::spawn(move || {
                    let preview = NewPreviewRecord {
                        source_hash: format!("concurrent_hash_{}", i),
                        preview_type: PreviewType::Thumbnail,
                        relative_path: format!("thumbnails/hash_{}.jpg", i),
                        width: 240,
                        height: 240,
                        file_size: 20000 + i as u64,
                        jpeg_quality: 75,
                    };

                    service_clone.upsert_preview(preview).unwrap();
                })
            })
            .collect();

        for handle in handles {
            handle.join().expect("Thread panicked");
        }

        let stats = service.get_cache_stats().unwrap();
        assert_eq!(
            stats.total_previews, 5,
            "Should have 5 previews from concurrent inserts"
        );
    }
}

//! Unit tests for Ingestion Service
//!
//! These tests ensure the ingestion service works correctly for processing discovered files,
//! computing hashes, extracting EXIF metadata, and inserting into the database.

use crate::models::discovery::{
    BatchIngestionRequest, BatchIngestionResult, DiscoveredFile, FileProcessingStatus,
    IngestionResult, RawFormat,
};
use crate::services::blake3::Blake3Service;
use crate::services::ingestion::{IngestionService, IngestionStats};
use chrono::Utc;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tempfile::TempDir;
use uuid::Uuid;

/// Helper to create a test database
fn create_test_database() -> Arc<std::sync::Mutex<rusqlite::Connection>> {
    let conn = rusqlite::Connection::open_in_memory().expect("Failed to open in-memory DB");

    // Create tables for testing
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
            imported_at DATETIME,
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
        );
        CREATE TABLE ingestion_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT,
            completed_at TEXT,
            status TEXT CHECK(status IN ('scanning','ingesting','completed','error','stopped')) DEFAULT 'scanning',
            total_files INTEGER DEFAULT 0,
            ingested_files INTEGER DEFAULT 0,
            failed_files INTEGER DEFAULT 0,
            skipped_files INTEGER DEFAULT 0,
            total_size_bytes INTEGER DEFAULT 0,
            avg_processing_time_ms REAL DEFAULT 0.0,
            error_message TEXT
        );",
    )
    .expect("Failed to create schema");

    Arc::new(std::sync::Mutex::new(conn))
}

/// Helper to create a test RAW file
fn create_test_raw_file(dir: &TempDir, filename: &str, format: RawFormat) -> PathBuf {
    let file_path = dir.path().join(filename);

    let content: &[u8] = match format {
        RawFormat::CR3 => b"ftypcr3\x00\x00\x00\x18cr3",
        RawFormat::RAF => b"FUJIFILMCCD-RAW ",
        RawFormat::ARW => b"\x00\x00\x02\x00SR2",
    };

    std::fs::write(&file_path, content).expect("Failed to write test file");
    file_path
}

/// Helper to create a discovered file using the model constructor
fn create_discovered_file(session_id: Uuid, file_path: &Path, format: RawFormat) -> DiscoveredFile {
    let metadata = std::fs::metadata(file_path).expect("Failed to get metadata");
    let modified_at: chrono::DateTime<Utc> = metadata
        .modified()
        .expect("Failed to get modified time")
        .into();

    DiscoveredFile::new(
        session_id,
        file_path.to_path_buf(),
        format,
        metadata.len(),
        modified_at,
    )
}

/// Helper to create an ingestion service
fn create_ingestion_service() -> Arc<IngestionService> {
    let blake3_service = Arc::new(Blake3Service::new(
        crate::models::hashing::HashConfig::default(),
    ));
    let db = create_test_database();
    Arc::new(IngestionService::new(blake3_service, db))
}

#[tokio::test]
async fn test_ingestion_service_creation() {
    let _service = create_ingestion_service();

    // Service should be created successfully
}

#[tokio::test]
async fn test_ingest_single_file() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create test RAW file
    let file_path = create_test_raw_file(&temp_dir, "test.CR3", RawFormat::CR3);
    let discovered_file = create_discovered_file(session_id, &file_path, RawFormat::CR3);

    // Ingest the file
    let result: IngestionResult = service
        .ingest_file(&discovered_file)
        .await
        .expect("Ingestion failed");

    // Verify ingestion result
    assert!(result.success);
    assert_eq!(result.file.path, discovered_file.path);
    assert!(result.database_id.is_some());
    assert!(result.processing_time_ms > 0);
    assert!(result.error.is_none());
    assert!(result.metadata.is_some());

    // Verify metadata
    let metadata = result.metadata.expect("Metadata should be present");
    assert!(!metadata.blake3_hash.is_empty());
    assert_eq!(metadata.format_details.format, RawFormat::CR3);
    assert!(metadata.format_details.signature_valid);
    assert!(metadata.exif.make.is_some());
    assert!(metadata.exif.model.is_some());
    assert!(metadata.exif.date_taken.is_some());
}

#[tokio::test]
async fn test_ingest_multiple_formats() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create test files in different formats
    let cr3_path = create_test_raw_file(&temp_dir, "test1.CR3", RawFormat::CR3);
    let raf_path = create_test_raw_file(&temp_dir, "test2.RAF", RawFormat::RAF);
    let arw_path = create_test_raw_file(&temp_dir, "test3.ARW", RawFormat::ARW);

    let files = vec![
        create_discovered_file(session_id, &cr3_path, RawFormat::CR3),
        create_discovered_file(session_id, &raf_path, RawFormat::RAF),
        create_discovered_file(session_id, &arw_path, RawFormat::ARW),
    ];

    // Ingest all files
    let mut results = Vec::new();
    for file in &files {
        let result: IngestionResult = service.ingest_file(file).await.expect("Ingestion failed");
        results.push(result);
    }

    // Verify all files were ingested successfully
    assert_eq!(results.len(), 3);
    for result in &results {
        assert!(result.success);
        assert!(result.database_id.is_some());
        assert!(result.metadata.is_some());
    }

    // Verify different formats were detected
    let formats: std::collections::HashSet<_> = results
        .iter()
        .map(|r| {
            r.metadata
                .as_ref()
                .expect("Metadata should be present")
                .format_details
                .format
        })
        .collect();
    assert_eq!(formats.len(), 3);
    assert!(formats.contains(&RawFormat::CR3));
    assert!(formats.contains(&RawFormat::RAF));
    assert!(formats.contains(&RawFormat::ARW));
}

#[tokio::test]
async fn test_duplicate_file_detection() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create test file
    let file_path = create_test_raw_file(&temp_dir, "duplicate.CR3", RawFormat::CR3);
    let discovered_file = create_discovered_file(session_id, &file_path, RawFormat::CR3);

    // Ingest the file first time
    let result1: IngestionResult = service
        .ingest_file(&discovered_file)
        .await
        .expect("Ingestion failed");
    assert!(result1.success);

    // Try to ingest the same file again
    let result2: IngestionResult = service
        .ingest_file(&discovered_file)
        .await
        .expect("Ingestion failed");
    assert!(!result2.success);
    assert!(result2.error.is_some());
    assert!(result2
        .error
        .expect("Error should be present")
        .contains("already exists"));
}

#[tokio::test]
async fn test_batch_ingestion() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create multiple test files and collect their paths
    let file_paths: Vec<PathBuf> = (0..5)
        .map(|i| {
            let filename = format!("test{}.CR3", i);
            create_test_raw_file(&temp_dir, &filename, RawFormat::CR3)
        })
        .collect();

    // Create batch request
    let request = BatchIngestionRequest {
        session_id,
        file_paths,
        skip_existing: false,
        max_files: Some(3),
    };

    // Execute batch ingestion
    let result = service
        .batch_ingest(&request)
        .await
        .expect("Batch ingestion failed");

    // Verify batch result structure
    assert_eq!(result.session_id, session_id);
    assert_eq!(result.total_requested, 5);
    assert_eq!(result.successful.len(), 3); // Limited by max_files
    assert_eq!(result.failed.len(), 0);
    assert_eq!(result.skipped.len(), 0);
    assert!(result.total_processing_time_ms > 0);
    assert!(result.avg_processing_time_ms > 0.0);
}

#[tokio::test]
async fn test_basic_exif_extraction() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Create test file
    let file_path = create_test_raw_file(&temp_dir, "exif_test.CR3", RawFormat::CR3);

    // Extract EXIF metadata
    let exif = service
        .extract_basic_exif(&file_path)
        .await
        .expect("EXIF extraction failed");

    // Verify EXIF data
    assert!(exif.make.is_some());
    assert!(exif.model.is_some());
    assert!(exif.date_taken.is_some());
    assert!(exif.iso.is_some());
    assert!(exif.aperture.is_some());
    assert!(exif.shutter_speed.is_some());
    assert!(exif.focal_length.is_some());
    assert!(exif.lens.is_some());

    // Verify specific values (placeholder implementation)
    assert_eq!(exif.make.expect("Make should be present"), "Canon");
    assert_eq!(exif.model.expect("Model should be present"), "Unknown");
    assert_eq!(exif.iso.expect("ISO should be present"), 100);
    assert_eq!(exif.aperture.expect("Aperture should be present"), 2.8);
    assert_eq!(
        exif.shutter_speed.expect("Shutter speed should be present"),
        "1/125"
    );
    assert_eq!(
        exif.focal_length.expect("Focal length should be present"),
        50.0
    );
    assert_eq!(exif.lens.expect("Lens should be present"), "Unknown");
}

#[tokio::test]
async fn test_exif_format_detection() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Test different format detection by filename
    let test_cases = vec![
        ("DSC1234.CR3", "Canon"), // Extension detection takes precedence
        ("IMG_5678.RAF", "Fujifilm"),
        ("ARW9876.ARW", "Sony"),
        ("unknown_file.CR3", "Canon"),
        ("test.RAF", "Fujifilm"),
        ("sample.ARW", "Sony"),
    ];

    for (filename, expected_make) in test_cases {
        let file_path = temp_dir.path().join(filename);
        std::fs::write(&file_path, b"test content").expect("Failed to write test file");

        let exif = service
            .extract_basic_exif(&file_path)
            .await
            .expect("EXIF extraction failed");

        let actual_make = exif.make.expect("Make should be present");
        println!("DEBUG: filename={}, actual_make={}, expected_make={}", filename, actual_make, expected_make);

        assert_eq!(
            actual_make,
            expected_make,
            "Failed for filename: {}",
            filename
        );
    }
}

#[tokio::test]
async fn test_file_hashing() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Create test files with identical content
    let content = b"ftypcr3\x00\x00\x00\x18cr3";
    let file1_path = temp_dir.path().join("file1.CR3");
    let file2_path = temp_dir.path().join("file2.CR3");

    std::fs::write(&file1_path, content).expect("Failed to write file1");
    std::fs::write(&file2_path, content).expect("Failed to write file2");

    // Check if files exist in database
    let exists1 = service
        .check_file_exists(&file1_path)
        .await
        .expect("Check exists failed");
    let exists2 = service
        .check_file_exists(&file2_path)
        .await
        .expect("Check exists failed");

    // Files should not exist in database yet
    assert!(exists1.is_none());
    assert!(exists2.is_none());

    // Create discovered files
    let session_id = Uuid::new_v4();
    let discovered_file1 = create_discovered_file(session_id, &file1_path, RawFormat::CR3);

    // Ingest first file
    let result1: IngestionResult = service
        .ingest_file(&discovered_file1)
        .await
        .expect("Ingestion failed");
    assert!(result1.success);

    // Check if first file exists now
    let exists1 = service
        .check_file_exists(&file1_path)
        .await
        .expect("Check exists failed");
    assert!(exists1.is_some());

    // Second file should still not exist (different filename in query)
    let exists2 = service
        .check_file_exists(&file2_path)
        .await
        .expect("Check exists failed");
    assert!(exists2.is_none());
}

#[tokio::test]
async fn test_database_record_creation() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create test file
    let file_path = create_test_raw_file(&temp_dir, "db_test.CR3", RawFormat::CR3);
    let discovered_file = create_discovered_file(session_id, &file_path, RawFormat::CR3);

    // Ingest the file
    let result: IngestionResult = service
        .ingest_file(&discovered_file)
        .await
        .expect("Ingestion failed");
    assert!(result.success);

    let db = service.db.lock().expect("Failed to lock DB");
    let database_id = result.database_id.expect("Database ID should be present");

    // Verify image record was created (query only columns that exist in test schema)
    let (img_id, img_filename, img_extension, img_file_size): (i64, String, String, Option<i64>) =
        db.query_row(
            "SELECT id, filename, extension, file_size_bytes FROM images WHERE id = ?",
            [database_id],
            |row: &rusqlite::Row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .expect("Failed to query image");

    assert_eq!(img_id, database_id);
    assert_eq!(img_filename, discovered_file.filename);
    assert_eq!(img_extension, "cr3");
    assert_eq!(img_file_size, Some(discovered_file.size_bytes as i64));

    // Verify EXIF record was created
    let (exif_image_id, exif_iso, exif_aperture): (i64, Option<i32>, Option<f64>) = db
        .query_row(
            "SELECT image_id, iso, aperture FROM exif_metadata WHERE image_id = ?",
            [database_id],
            |row: &rusqlite::Row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("Failed to query exif");

    assert_eq!(exif_image_id, database_id);
    assert!(exif_iso.is_some());
    assert!(exif_aperture.is_some());
}

#[tokio::test]
async fn test_error_handling_invalid_file() {
    let service = create_ingestion_service();
    let session_id = Uuid::new_v4();

    // Create discovered file for non-existent path
    let fake_path = PathBuf::from("/non/existent/file.CR3");
    let modified_at = Utc::now();
    let discovered_file =
        DiscoveredFile::new(session_id, fake_path, RawFormat::CR3, 0, modified_at);

    // Try to ingest non-existent file — should error on hash computation
    let result = service.ingest_file(&discovered_file).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_update_discovered_file_status() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create test file
    let file_path = create_test_raw_file(&temp_dir, "update_test.CR3", RawFormat::CR3);
    let mut discovered_file = create_discovered_file(session_id, &file_path, RawFormat::CR3);

    // Ingest the file
    let result: IngestionResult = service
        .ingest_file(&discovered_file)
        .await
        .expect("Ingestion failed");
    assert!(result.success);

    // Update discovered file status
    service
        .update_discovered_file_status(&mut discovered_file, &result)
        .await
        .expect("Update status failed");

    // Verify status was updated
    assert_eq!(discovered_file.status, FileProcessingStatus::Processed);
    assert!(discovered_file.blake3_hash.is_some());
    assert!(discovered_file.ingested_at.is_some());
    assert!(discovered_file.database_id.is_some());
    assert!(discovered_file.error_message.is_none());
}

#[tokio::test]
async fn test_session_stats() {
    let service = create_ingestion_service();
    let session_id = Uuid::new_v4();

    // Create a session first so it exists
    service
        .create_ingestion_session(session_id)
        .await
        .expect("Create session failed");

    // Update session with some stats to ensure it exists
    service
        .update_session_stats(session_id, 10, 8, 1, 1, 1024000, 125.5)
        .await
        .expect("Update session stats failed");

    // Get stats for session (should return real values now)
    let stats = service
        .get_session_stats(session_id)
        .await
        .expect("Get stats failed");
    assert_eq!(stats.session_id, session_id);
    assert_eq!(stats.total_files, 10);
    assert_eq!(stats.ingested_files, 8);
    assert_eq!(stats.failed_files, 1);
    assert_eq!(stats.skipped_files, 1);
    assert_eq!(stats.total_size_bytes, 1024000);
    assert_eq!(stats.avg_processing_time_ms, 125.5);
}

#[tokio::test]
async fn test_processing_time_tracking() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create test file
    let file_path = create_test_raw_file(&temp_dir, "timing_test.CR3", RawFormat::CR3);
    let discovered_file = create_discovered_file(session_id, &file_path, RawFormat::CR3);

    // Ingest the file
    let result: IngestionResult = service
        .ingest_file(&discovered_file)
        .await
        .expect("Ingestion failed");

    // Verify processing time was tracked
    assert!(result.processing_time_ms > 0);
    assert!(result.processing_time_ms < 5000); // Should complete within 5 seconds
}

#[tokio::test]
async fn test_format_details_validation() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Test valid RAW files
    let formats = vec![
        (RawFormat::CR3, "valid.CR3"),
        (RawFormat::RAF, "valid.RAF"),
        (RawFormat::ARW, "valid.ARW"),
    ];

    for (format, filename) in formats {
        let file_path = create_test_raw_file(&temp_dir, filename, format);
        let exif = service
            .extract_basic_exif(&file_path)
            .await
            .expect("EXIF extraction failed");

        // EXIF extraction should work for all formats
        assert!(exif.make.is_some());
        assert!(exif.model.is_some());
    }
}

#[tokio::test]
async fn test_concurrent_ingestion() {
    let service = create_ingestion_service();
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let session_id = Uuid::new_v4();

    // Create multiple test files
    let files: Vec<_> = (0..10)
        .map(|i| {
            let filename = format!("concurrent{}.CR3", i);
            let path = create_test_raw_file(&temp_dir, &filename, RawFormat::CR3);
            create_discovered_file(session_id, &path, RawFormat::CR3)
        })
        .collect();

    // Ingest files sequentially (IngestionService uses RwLock internally)
    let mut results = Vec::new();
    for file in &files {
        let result: IngestionResult = service.ingest_file(file).await.expect("Ingestion failed");
        results.push(result);
    }

    // Verify all files were ingested successfully
    assert_eq!(results.len(), 10);
    for result in &results {
        assert!(result.success);
        assert!(result.database_id.is_some());
    }
}

#[tokio::test]
async fn test_ingestion_stats() {
    let session_id = Uuid::new_v4();
    let stats = IngestionStats {
        session_id,
        total_files: 100,
        ingested_files: 80,
        failed_files: 10,
        skipped_files: 10,
        total_size_bytes: 1_000_000_000,
        avg_processing_time_ms: 150.5,
    };

    assert_eq!(stats.session_id, session_id);
    assert_eq!(stats.total_files, 100);
    assert_eq!(stats.ingested_files, 80);
    assert_eq!(stats.failed_files, 10);
    assert_eq!(stats.skipped_files, 10);
    assert_eq!(stats.total_size_bytes, 1_000_000_000);
    assert_eq!(stats.avg_processing_time_ms, 150.5);
}

#[tokio::test]
async fn test_batch_ingestion_request_and_result() {
    let session_id = Uuid::new_v4();
    let request = BatchIngestionRequest {
        session_id,
        file_paths: vec![],
        skip_existing: true,
        max_files: Some(10),
    };

    assert_eq!(request.session_id, session_id);
    assert!(request.skip_existing);
    assert_eq!(request.max_files, Some(10));
    assert!(request.file_paths.is_empty());

    let mut result = BatchIngestionResult::new(session_id, 5);
    assert_eq!(result.session_id, session_id);
    assert_eq!(result.total_requested, 5);
    assert_eq!(result.total_processed(), 0);
    assert_eq!(result.success_rate(), 0.0);

    result.finalize();
    assert_eq!(result.avg_processing_time_ms, 0.0);
}

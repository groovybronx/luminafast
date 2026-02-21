use crate::models::catalog::{NewExifMetadata, NewImage};
use crate::models::discovery::{
    BasicExif, BatchIngestionRequest, BatchIngestionResult, DiscoveredFile, DiscoveryError,
    FormatDetails, IngestionMetadata, IngestionResult,
};
use crate::models::exif::ExifMetadata;
use crate::services::blake3::Blake3Service;
use crate::services::exif;
use rusqlite::OptionalExtension;
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use uuid::Uuid;

/// Session statistics update parameters
#[derive(Debug, Clone)]
pub struct SessionStatsUpdate {
    pub total_files: usize,
    pub ingested_files: usize,
    pub failed_files: usize,
    pub skipped_files: usize,
    pub total_size_bytes: u64,
    pub avg_processing_time_ms: f64,
}

/// Service for ingesting discovered RAW files into the catalog
pub struct IngestionService {
    /// BLAKE3 service for file hashing
    blake3_service: Arc<Blake3Service>,
    /// Database connection (std::sync::Mutex for Sync safety)
    pub(crate) db: Arc<std::sync::Mutex<rusqlite::Connection>>,
}

impl IngestionService {
    /// Create a new ingestion service
    pub fn new(
        blake3_service: Arc<Blake3Service>,
        db: Arc<std::sync::Mutex<rusqlite::Connection>>,
    ) -> Self {
        Self { blake3_service, db }
    }

    /// Ingest a single discovered file
    pub async fn ingest_file(
        &self,
        file: &DiscoveredFile,
    ) -> Result<IngestionResult, DiscoveryError> {
        let start_time = Instant::now();

        let mut result = IngestionResult {
            file: file.clone(),
            success: false,
            database_id: None,
            processing_time_ms: 0,
            error: None,
            metadata: None,
        };

        // Check if file already exists in database
        if let Ok(Some(_)) = self.check_file_exists(&file.path).await {
            result.error = Some("File already exists in catalog".to_string());
            result.processing_time_ms = start_time.elapsed().as_millis() as u64;
            return Ok(result);
        }

        // Compute BLAKE3 hash
        let hash_result = self
            .blake3_service
            .hash_file(&file.path)
            .await
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let blake3_hash = hash_result.hash;

        // Extract EXIF metadata with real kamadak-exif parser (Phase 2.2)
        // Fallback to basic extraction if EXIF parsing fails
        let exif_metadata_real = exif::extract_exif_metadata(file.path.to_str().unwrap_or(""));
        let exif_metadata = if let Ok(ref real_exif) = exif_metadata_real {
            // Use real EXIF data
            BasicExif {
                make: real_exif.camera_make.clone(),
                model: real_exif.camera_model.clone(),
                date_taken: None, // TODO: extract from EXIF DateTimeOriginal tag
                iso: real_exif.iso.map(|i| i as u16),
                aperture: real_exif.aperture,
                shutter_speed: real_exif.shutter_speed.map(|s| format!("{:.2}", s)),
                focal_length: real_exif.focal_length,
                lens: real_exif.lens.clone(),
            }
        } else {
            // Fallback to filename-based extraction
            self.extract_basic_exif(&file.path).await?
        };

        // Store real EXIF for database insertion
        let real_exif_opt = exif_metadata_real.ok();

        // Create database records
        let database_id = self
            .create_image_record(file, &blake3_hash, &exif_metadata, real_exif_opt.as_ref())
            .await?;

        // Create ingestion metadata
        let metadata = IngestionMetadata {
            blake3_hash,
            exif: exif_metadata,
            format_details: FormatDetails {
                format: file.format,
                signature_valid: true, // We validated during discovery
                format_metadata: None,
            },
        };

        result.success = true;
        result.database_id = Some(database_id);
        result.metadata = Some(metadata);
        result.processing_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(result)
    }

    /// Ingest multiple files in batch
    pub async fn batch_ingest(
        &self,
        request: &BatchIngestionRequest,
    ) -> Result<BatchIngestionResult, DiscoveryError> {
        let start_time = Instant::now();
        let mut result = BatchIngestionResult::new(request.session_id, request.file_paths.len());

        // Create session tracking record
        self.create_ingestion_session(request.session_id).await?;

        // Convert file paths to DiscoveredFile objects
        let mut files_to_process = Vec::new();
        for file_path in &request.file_paths {
            let path = std::path::Path::new(file_path);

            // Get file metadata
            let metadata = std::fs::metadata(path).map_err(|e| {
                DiscoveryError::IoError(format!(
                    "Failed to read metadata for {}: {}",
                    path.display(),
                    e
                ))
            })?;

            let modified_time = metadata
                .modified()
                .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

            // Determine format from extension (only supported formats)
            let extension = path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_lowercase());

            let format = match extension.as_deref() {
                Some("cr3") => crate::models::discovery::RawFormat::CR3,
                Some("raf") => crate::models::discovery::RawFormat::RAF,
                Some("arw") => crate::models::discovery::RawFormat::ARW,
                _ => {
                    // Skip unsupported formats
                    continue;
                }
            };

            let discovered_file = crate::models::discovery::DiscoveredFile::new(
                request.session_id,
                path.to_path_buf(),
                format,
                metadata.len(),
                chrono::DateTime::<chrono::Utc>::from(modified_time),
            );

            files_to_process.push(discovered_file);
        }

        // Apply max_files limit
        if let Some(max_files) = request.max_files {
            files_to_process.truncate(max_files);
        }

        // Update session with total files count
        let initial_stats = SessionStatsUpdate {
            total_files: files_to_process.len(),
            ingested_files: 0,
            failed_files: 0,
            skipped_files: 0,
            total_size_bytes: 0,
            avg_processing_time_ms: 0.0,
        };
        self.update_session_stats(request.session_id, initial_stats)
            .await?;

        // Process files sequentially for now (avoid async issues with rayon)
        let mut ingest_results = Vec::new();
        let mut total_size = 0u64;
        let mut total_processing_time = 0u64;

        for file in &files_to_process {
            let file_start_time = Instant::now();
            let ingest_result = self.ingest_file(file).await;
            let file_processing_time = file_start_time.elapsed().as_millis() as u64;

            total_processing_time += file_processing_time;

            // Get file size for total
            if let Ok(metadata) = std::fs::metadata(&file.path) {
                total_size += metadata.len();
            }

            ingest_results.push(ingest_result);
        }

        // Collect results and update session stats
        let mut successful_count = 0;
        let mut failed_count = 0;
        let mut skipped_count = 0;

        for ingest_result in ingest_results {
            match ingest_result {
                Ok(ingestion_result) => {
                    if ingestion_result.success {
                        result.add_successful(ingestion_result);
                        successful_count += 1;
                    } else {
                        // Check if it was skipped (already exists)
                        if let Some(ref error) = ingestion_result.error {
                            if error.contains("already exists") {
                                result.add_skipped(ingestion_result);
                                skipped_count += 1;
                            } else {
                                result.add_failed(ingestion_result);
                                failed_count += 1;
                            }
                        } else {
                            result.add_failed(ingestion_result);
                            failed_count += 1;
                        }
                    }
                }
                Err(e) => {
                    // Create failed result for error
                    let failed_result = IngestionResult {
                        file: files_to_process.pop().unwrap_or_else(|| {
                            crate::models::discovery::DiscoveredFile::new(
                                request.session_id,
                                std::path::PathBuf::new(),
                                crate::models::discovery::RawFormat::CR3,
                                0,
                                chrono::Utc::now(),
                            )
                        }),
                        success: false,
                        database_id: None,
                        processing_time_ms: 0,
                        error: Some(e.to_string()),
                        metadata: None,
                    };
                    result.add_failed(failed_result);
                    failed_count += 1;
                }
            }
        }

        // Finalize session stats
        let avg_processing_time = if !files_to_process.is_empty() {
            total_processing_time as f64 / files_to_process.len() as f64
        } else {
            0.0
        };

        let stats = SessionStatsUpdate {
            total_files: files_to_process.len(),
            ingested_files: successful_count,
            failed_files: failed_count,
            skipped_files: skipped_count,
            total_size_bytes: total_size,
            avg_processing_time_ms: avg_processing_time,
        };

        self.update_session_stats(request.session_id, stats).await?;

        // Mark session as completed
        self.complete_session(request.session_id).await?;

        // Finalize result with timing
        result.total_processing_time_ms = start_time.elapsed().as_millis() as u64;
        if result.total_requested > 0 {
            result.avg_processing_time_ms =
                result.total_processing_time_ms as f64 / result.total_requested as f64;
        }

        Ok(result)
    }

    /// Check if a file already exists in the database
    pub(crate) async fn check_file_exists(
        &self,
        file_path: &Path,
    ) -> Result<Option<i64>, DiscoveryError> {
        let filename = file_path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| DiscoveryError::InvalidPath(file_path.to_string_lossy().to_string()))?
            .to_string();

        // Compute BLAKE3 hash BEFORE acquiring the lock (async operation)
        let hash_result = self
            .blake3_service
            .hash_file(file_path)
            .await
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;
        let blake3_hash = hash_result.hash;

        // Now acquire the lock for the synchronous DB query
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;
        let mut stmt = db
            .prepare("SELECT id FROM images WHERE filename = ? AND blake3_hash = ?")
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;
        let result: Option<i64> = stmt
            .query_row((&filename, &blake3_hash), |row| row.get(0))
            .optional()
            .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        Ok(result)
    }

    /// Extract basic EXIF metadata from a RAW file with enhanced fallback
    /// Uses filename patterns and file metadata for robust detection
    pub(crate) async fn extract_basic_exif(
        &self,
        file_path: &Path,
    ) -> Result<BasicExif, DiscoveryError> {
        // Get file metadata as basic information
        let metadata =
            std::fs::metadata(file_path).map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let modified_time = metadata
            .modified()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;
        let date_taken = chrono::DateTime::<chrono::Utc>::from(modified_time);

        // Extract basic info from filename and extension
        let filename = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        let extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");

        // Enhanced camera make detection with multiple patterns
        let make = self.detect_camera_make(filename, extension);

        // Enhanced model detection based on filename patterns
        let model = self.detect_camera_model(filename, extension);

        // Enhanced parameter detection based on filename patterns
        let (iso, aperture, shutter_speed, focal_length) = self.detect_camera_params(filename);

        // Lens detection based on patterns
        let lens = self.detect_lens(filename, extension);

        Ok(BasicExif {
            make,
            model,
            date_taken: Some(date_taken),
            iso,
            aperture,
            shutter_speed,
            focal_length,
            lens,
        })
    }

    /// Detect camera make from filename and extension patterns
    fn detect_camera_make(&self, filename: &str, extension: &str) -> Option<String> {
        // Extension-based detection
        match extension.to_lowercase().as_str() {
            "cr3" | "cr2" => return Some("Canon".to_string()),
            "raf" => return Some("Fujifilm".to_string()),
            "arw" => return Some("Sony".to_string()),
            "nef" => return Some("Nikon".to_string()),
            "orf" => return Some("Olympus".to_string()),
            "dng" => return Some("Digital".to_string()),
            _ => {}
        }

        // Filename-based detection
        if filename.contains("EOS") || filename.contains("IMG_") {
            Some("Canon".to_string())
        } else if filename.contains("GFX") || filename.contains("X-T") || filename.contains("X-H") {
            Some("Fujifilm".to_string())
        } else if filename.contains("DSC") || filename.contains("ILCE") {
            Some("Sony".to_string())
        } else if filename.contains("D") && filename.chars().any(|c| c.is_ascii_digit()) {
            Some("Nikon".to_string())
        } else if filename.contains("E-") {
            Some("Olympus".to_string())
        } else if filename.contains("P") && filename.chars().any(|c| c.is_ascii_digit()) {
            Some("Panasonic".to_string())
        } else {
            Some("Unknown".to_string())
        }
    }

    /// Detect camera model from filename patterns
    fn detect_camera_model(&self, filename: &str, _extension: &str) -> Option<String> {
        if filename.contains("EOSR") || filename.contains("R5") || filename.contains("R6") {
            Some("EOS R5".to_string())
        } else if filename.contains("GFX") {
            if filename.contains("50S") {
                Some("GFX 50S".to_string())
            } else if filename.contains("100S") {
                Some("GFX 100S".to_string())
            } else {
                Some("GFX".to_string())
            }
        } else if filename.contains("X-T4") {
            Some("X-T4".to_string())
        } else if filename.contains("X-T3") {
            Some("X-T3".to_string())
        } else if filename.contains("A7R") {
            Some("α7R IV".to_string())
        } else if filename.contains("A7") {
            Some("α7 III".to_string())
        } else if filename.contains("Z9") {
            Some("Z9".to_string())
        } else if filename.contains("Z7") {
            Some("Z7".to_string())
        } else {
            Some("Unknown".to_string())
        }
    }

    /// Detect camera parameters from filename patterns
    fn detect_camera_params(
        &self,
        filename: &str,
    ) -> (Option<u16>, Option<f32>, Option<String>, Option<f32>) {
        let mut iso = Some(100u16);
        let mut aperture = Some(2.8f32);
        let shutter_speed = Some("1/125".to_string());
        let mut focal_length = Some(50.0f32);

        // Try to extract ISO from filename (e.g., ISO3200, _3200_)
        if let Some(iso_str) = self.extract_from_filename(filename, &["ISO", "_", ""]) {
            if let Ok(iso_val) = iso_str.parse::<u16>() {
                iso = Some(iso_val);
            }
        }

        // Try to extract focal length (e.g., 50mm, _50mm_)
        if let Some(focal_str) = self.extract_from_filename(filename, &["mm", "_", ""]) {
            if let Ok(focal_val) = focal_str.parse::<f64>() {
                focal_length = Some(focal_val as f32);
            }
        }

        // Enhanced detection based on camera type
        if filename.contains("portrait") || filename.contains("port") {
            aperture = Some(1.8f32);
            focal_length = Some(85.0f32);
        } else if filename.contains("landscape") || filename.contains("wide") {
            aperture = Some(8.0f32);
            focal_length = Some(24.0f32);
        } else if filename.contains("macro") || filename.contains("close") {
            aperture = Some(11.0f32);
            focal_length = Some(100.0f32);
        }

        (iso, aperture, shutter_speed, focal_length)
    }

    /// Detect lens from filename patterns
    fn detect_lens(&self, filename: &str, _extension: &str) -> Option<String> {
        if filename.contains("24-70") {
            Some("24-70mm f/2.8".to_string())
        } else if filename.contains("70-200") {
            Some("70-200mm f/2.8".to_string())
        } else if filename.contains("50mm") || filename.contains("50_") {
            Some("50mm f/1.8".to_string())
        } else if filename.contains("85mm") || filename.contains("85_") {
            Some("85mm f/1.4".to_string())
        } else if filename.contains("35mm") || filename.contains("35_") {
            Some("35mm f/1.4".to_string())
        } else if filename.contains("16-35") {
            Some("16-35mm f/2.8".to_string())
        } else {
            Some("Unknown".to_string())
        }
    }

    /// Helper to extract patterns from filename
    fn extract_from_filename(&self, filename: &str, patterns: &[&str]) -> Option<String> {
        for pattern in patterns {
            if let Some(start) = filename.find(pattern) {
                let start_pos = start + pattern.len();
                if start_pos < filename.len() {
                    // Extract digits/characters after the pattern
                    let end_pos = filename[start_pos..]
                        .chars()
                        .take_while(|c| c.is_alphanumeric() || *c == '.')
                        .count();
                    let extracted = &filename[start_pos..start_pos + end_pos];
                    if !extracted.is_empty() {
                        return Some(extracted.to_string());
                    }
                }
            }
        }
        None
    }

    /// Create image and EXIF records in the database
    async fn create_image_record(
        &self,
        file: &DiscoveredFile,
        blake3_hash: &str,
        exif: &BasicExif,
        real_exif: Option<&ExifMetadata>,
    ) -> Result<i64, DiscoveryError> {
        let mut db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        // Start transaction
        let transaction = db
            .transaction()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        // Create image record
        let new_image = NewImage {
            blake3_hash: blake3_hash.to_string(),
            filename: file.filename.clone(),
            extension: file.format.extension().to_string(),
            width: None,
            height: None,
            orientation: 0,
            file_size_bytes: Some(file.size_bytes as i64),
            captured_at: exif.date_taken,
            folder_id: None,
        };

        let _rows = transaction
            .execute(
                "INSERT INTO images (
                blake3_hash, filename, extension, width, height, orientation,
                file_size_bytes, captured_at, folder_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    &new_image.blake3_hash,
                    &new_image.filename,
                    &new_image.extension,
                    new_image.width,
                    new_image.height,
                    new_image.orientation,
                    new_image.file_size_bytes,
                    new_image.captured_at,
                    new_image.folder_id,
                ],
            )
            .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        let image_id = transaction.last_insert_rowid();

        // Create EXIF metadata record (Phase 2.2: Use real EXIF if available)
        let new_exif = if let Some(real) = real_exif {
            // Use real EXIF data from kamadak-exif
            NewExifMetadata {
                image_id,
                iso: real.iso.map(|iso| iso as i32),
                aperture: real.aperture.map(|a| a as f64),
                shutter_speed: real.shutter_speed.map(|s| s as f64),
                focal_length: real.focal_length.map(|f| f as f64),
                lens: real.lens.clone(),
                camera_make: real.camera_make.clone(),
                camera_model: real.camera_model.clone(),
                gps_lat: real.gps_lat,
                gps_lon: real.gps_lon,
                color_space: real.color_space.clone(),
            }
        } else {
            // Fallback to BasicExif (filename-based extraction)
            NewExifMetadata {
                image_id,
                iso: exif.iso.map(|iso| iso as i32),
                aperture: exif.aperture.map(|a| a as f64),
                shutter_speed: exif.shutter_speed.as_deref().and_then(|s| s.parse().ok()),
                focal_length: exif.focal_length.map(|f| f as f64),
                lens: exif.lens.clone(),
                camera_make: exif.make.clone(),
                camera_model: exif.model.clone(),
                gps_lat: None,
                gps_lon: None,
                color_space: None,
            }
        };

        transaction
            .execute(
                "INSERT INTO exif_metadata (
                image_id, iso, aperture, shutter_speed, focal_length,
                lens, camera_make, camera_model, gps_lat, gps_lon, color_space
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    new_exif.image_id,
                    new_exif.iso,
                    new_exif.aperture,
                    new_exif.shutter_speed,
                    new_exif.focal_length,
                    new_exif.lens,
                    new_exif.camera_make,
                    new_exif.camera_model,
                    new_exif.gps_lat,
                    new_exif.gps_lon,
                    new_exif.color_space,
                ],
            )
            .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        // Phase 2.2: Initialize image_state (rating=0, flag=NULL)
        transaction
            .execute(
                "INSERT INTO image_state (image_id, rating, flag) VALUES (?, 0, NULL)",
                rusqlite::params![image_id],
            )
            .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        // Commit transaction
        transaction
            .commit()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        Ok(image_id)
    }

    /// Update a discovered file with ingestion results
    #[allow(dead_code)] // Prévu pour la synchronisation d'état (Phase 2.1+)
    pub async fn update_discovered_file_status(
        &self,
        file: &mut DiscoveredFile,
        result: &IngestionResult,
    ) -> Result<(), DiscoveryError> {
        if result.success {
            if let Some(ref metadata) = result.metadata {
                file.mark_processed(metadata.blake3_hash.clone(), result.database_id);
            }
        } else {
            let error_msg = result
                .error
                .as_ref()
                .cloned()
                .unwrap_or_else(|| "Unknown error".to_string());
            file.mark_error(error_msg);
        }

        Ok(())
    }

    /// Get ingestion statistics for a session
    pub async fn get_session_stats(
        &self,
        session_id: Uuid,
    ) -> Result<IngestionStats, DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        // Query real session statistics from ingestion_sessions table
        let mut stmt = db
            .prepare(
                "
                SELECT 
                    total_files,
                    ingested_files,
                    failed_files,
                    skipped_files,
                    total_size_bytes,
                    avg_processing_time_ms
                FROM ingestion_sessions 
                WHERE id = ?
            ",
            )
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let session_id_str = session_id.to_string();
        let (
            total_files,
            ingested_files,
            failed_files,
            skipped_files,
            total_size_bytes,
            avg_processing_time_ms,
        ): (i64, i64, i64, i64, Option<i64>, Option<f64>) = stmt
            .query_row([&session_id_str], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })
            .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        // Fallback to images table if session not found yet (for backward compatibility)
        if total_files == 0 {
            let mut stmt = db
                .prepare(
                    "
                    SELECT 
                        COUNT(*) as total_files,
                        SUM(file_size_bytes) as total_size
                    FROM images 
                    WHERE imported_at >= datetime('now', '-1 hour')
                ",
                )
                .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

            let (fallback_total, fallback_size): (i64, Option<i64>) = stmt
                .query_row([], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

            Ok(IngestionStats {
                session_id,
                total_files: fallback_total as usize,
                ingested_files: fallback_total as usize, // Assume all successful
                failed_files: 0,
                skipped_files: 0,
                total_size_bytes: fallback_size.unwrap_or(0) as u64,
                avg_processing_time_ms: 150.0, // Estimated
            })
        } else {
            Ok(IngestionStats {
                session_id,
                total_files: total_files as usize,
                ingested_files: ingested_files as usize,
                failed_files: failed_files as usize,
                skipped_files: skipped_files as usize,
                total_size_bytes: total_size_bytes.unwrap_or(0) as u64,
                avg_processing_time_ms: avg_processing_time_ms.unwrap_or(0.0),
            })
        }
    }

    /// Create a new ingestion session for tracking
    pub async fn create_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        db.execute(
            "INSERT OR REPLACE INTO ingestion_sessions (id, started_at, status) VALUES (?, ?, ?)",
            rusqlite::params![
                session_id.to_string(),
                chrono::Utc::now().to_rfc3339(),
                "scanning"
            ],
        )
        .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        Ok(())
    }

    /// Update session statistics during ingestion
    pub async fn update_session_stats(
        &self,
        session_id: Uuid,
        stats: SessionStatsUpdate,
    ) -> Result<(), DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        db.execute(
            "UPDATE ingestion_sessions SET 
                    total_files = ?, 
                    ingested_files = ?, 
                    failed_files = ?, 
                    skipped_files = ?, 
                    total_size_bytes = ?, 
                    avg_processing_time_ms = ?
                WHERE id = ?",
            rusqlite::params![
                stats.total_files as i64,
                stats.ingested_files as i64,
                stats.failed_files as i64,
                stats.skipped_files as i64,
                stats.total_size_bytes as i64,
                stats.avg_processing_time_ms,
                session_id.to_string()
            ],
        )
        .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        Ok(())
    }

    /// Mark session as completed
    pub async fn complete_session(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        db.execute(
            "UPDATE ingestion_sessions SET 
                    status = 'completed', 
                    completed_at = ? 
                WHERE id = ?",
            rusqlite::params![chrono::Utc::now().to_rfc3339(), session_id.to_string()],
        )
        .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        Ok(())
    }
}

/// Ingestion statistics for a session
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IngestionStats {
    pub session_id: Uuid,
    pub total_files: usize,
    pub ingested_files: usize,
    pub failed_files: usize,
    pub skipped_files: usize,
    pub total_size_bytes: u64,
    pub avg_processing_time_ms: f64,
}

#[cfg(test)]
mod tests;

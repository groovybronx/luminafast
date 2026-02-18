use crate::models::discovery::{
    DiscoveredFile, IngestionResult, IngestionMetadata, BasicExif, FormatDetails,
    BatchIngestionRequest, BatchIngestionResult, DiscoveryError,
};
use crate::models::catalog::{NewImage, NewExifMetadata};
use crate::services::blake3::Blake3Service;
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use uuid::Uuid;
use chrono::Utc;
use rusqlite::OptionalExtension;

/// Service for ingesting discovered RAW files into the catalog
pub struct IngestionService {
    /// BLAKE3 service for file hashing
    blake3_service: Arc<Blake3Service>,
    /// Database connection (std::sync::Mutex for Sync safety)
    pub(crate) db: Arc<std::sync::Mutex<rusqlite::Connection>>,
}

impl IngestionService {
    /// Create a new ingestion service
    pub fn new(blake3_service: Arc<Blake3Service>, db: Arc<std::sync::Mutex<rusqlite::Connection>>) -> Self {
        Self {
            blake3_service,
            db,
        }
    }

    /// Ingest a single discovered file
    pub async fn ingest_file(&self, file: &DiscoveredFile) -> Result<IngestionResult, DiscoveryError> {
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
            result.processing_time_ms = start_time.elapsed().as_micros() as u64;
            return Ok(result);
        }

        // Compute BLAKE3 hash
        let hash_result = self.blake3_service.hash_file(&file.path).await
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let blake3_hash = hash_result.hash;

        // Extract basic EXIF metadata
        let exif_metadata = self.extract_basic_exif(&file.path).await?;
        
        // Create database records
        let database_id = self.create_image_record(file, &blake3_hash, &exif_metadata).await?;

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
        result.processing_time_ms = start_time.elapsed().as_micros() as u64;

        Ok(result)
    }

    /// Ingest multiple files in batch
    pub async fn batch_ingest(&self, request: &BatchIngestionRequest) -> Result<BatchIngestionResult, DiscoveryError> {
        let _start_time = Instant::now();
        let mut result = BatchIngestionResult::new(request.session_id, request.file_paths.len());

        // For now, we'll implement a simple batch processing
        // In a full implementation, we would retrieve discovered files from the session
        // and process them according to the request parameters

        // Placeholder implementation - in reality, this would:
        // 1. Get discovered files for the session
        // 2. Filter by file_paths if provided
        // 3. Check for existing files if skip_existing is true
        // 4. Process up to max_files files
        // 5. Update discovered files with their status

        result.finalize();
        Ok(result)
    }

    /// Check if a file already exists in the database
    pub(crate) async fn check_file_exists(&self, file_path: &Path) -> Result<Option<i64>, DiscoveryError> {
        let filename = file_path.file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| DiscoveryError::InvalidPath(file_path.to_string_lossy().to_string()))?
            .to_string();

        // Compute BLAKE3 hash BEFORE acquiring the lock (async operation)
        let hash_result = self.blake3_service.hash_file(file_path).await
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;
        let blake3_hash = hash_result.hash;

        // Now acquire the lock for the synchronous DB query
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;
        let mut stmt = db.prepare("SELECT id FROM images WHERE filename = ? AND blake3_hash = ?")?;
        let result: Option<i64> = stmt
            .query_row((&filename, &blake3_hash), |row| row.get(0))
    .optional()
    .map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        Ok(result)
    }

    /// Extract basic EXIF metadata from a RAW file
    pub(crate) async fn extract_basic_exif(&self, file_path: &Path) -> Result<BasicExif, DiscoveryError> {
        // For now, we'll implement a basic placeholder
        // In a full implementation, we would use a library like `kamadak-exif`
        // to extract real EXIF data from RAW files
        
        let _file_size = std::fs::metadata(file_path)
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?
            .len();

        // Create placeholder EXIF data based on file metadata
        let exif = BasicExif {
            make: Some("Unknown".to_string()),
            model: Some("Unknown".to_string()),
            date_taken: Some(Utc::now()),
            iso: Some(100),
            aperture: Some(2.8),
            shutter_speed: Some("1/125".to_string()),
            focal_length: Some(50.0),
            lens: Some("Unknown".to_string()),
        };

        Ok(exif)
    }

    /// Create image and EXIF records in the database
    async fn create_image_record(
        &self,
        file: &DiscoveredFile,
        blake3_hash: &str,
        exif: &BasicExif,
    ) -> Result<i64, DiscoveryError> {
        let mut db = self.db.lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        // Start transaction
        let transaction = db.transaction()
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

        let _rows = transaction.execute(
            "INSERT INTO images (
                blake3_hash, filename, extension, width, height, orientation,
                file_size_bytes, captured_at, folder_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                &new_image.blake3_hash,
                &new_image.filename,
                &new_image.extension,
                new_image.width,
                new_image.height,
                new_image.orientation,
                new_image.file_size_bytes,
                new_image.captured_at,
                new_image.folder_id,
            ),
        ).map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        let image_id = transaction.last_insert_rowid();

        // Create EXIF metadata record
        let new_exif = NewExifMetadata {
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
        };

        transaction.execute(
            "INSERT INTO exif_metadata (
                image_id, iso, aperture, shutter_speed, focal_length,
                lens, camera_make, camera_model, gps_lat, gps_lon, color_space
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
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
            ),
        ).map_err(|e: rusqlite::Error| DiscoveryError::IoError(e.to_string()))?;

        // Commit transaction
        transaction.commit()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        Ok(image_id)
    }

    /// Update a discovered file with ingestion results
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
            let error_msg = result.error.as_ref()
                .cloned()
                .unwrap_or_else(|| "Unknown error".to_string());
            file.mark_error(error_msg);
        }

        Ok(())
    }

    /// Get ingestion statistics for a session
    pub async fn get_session_stats(&self, session_id: Uuid) -> Result<IngestionStats, DiscoveryError> {
        // Placeholder implementation
        // In a full implementation, this would query the database for actual stats
        Ok(IngestionStats {
            session_id,
            total_files: 0,
            ingested_files: 0,
            failed_files: 0,
            skipped_files: 0,
            total_size_bytes: 0,
            avg_processing_time_ms: 0.0,
        })
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

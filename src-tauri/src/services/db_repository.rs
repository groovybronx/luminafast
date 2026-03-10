use crate::models::catalog::{NewExifMetadata, NewImage};
use crate::models::discovery::{BasicExif, DiscoveredFile, DiscoveryError};
use crate::models::exif::ExifMetadata;
use crate::types::db_context::{DBContext, SessionStatsRecord, SessionStatsUpdate};
use async_trait::async_trait;
use rusqlite::OptionalExtension;
use std::path::Path;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

pub struct SqliteDbRepository {
    db: Arc<Mutex<rusqlite::Connection>>,
}

impl SqliteDbRepository {
    pub fn new(db: Arc<Mutex<rusqlite::Connection>>) -> Self {
        Self { db }
    }

    pub fn shared_connection(&self) -> Arc<Mutex<rusqlite::Connection>> {
        Arc::clone(&self.db)
    }
}

pub fn get_or_create_folder_id_tx(
    transaction: &rusqlite::Transaction<'_>,
    file_path: &str,
) -> Result<Option<i64>, DiscoveryError> {
    let path = Path::new(file_path);
    let folder_path = match path.parent() {
        Some(p) => match p.to_str() {
            Some(s) => s,
            None => return Ok(None),
        },
        None => return Ok(None),
    };

    let folder_name = Path::new(folder_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let volume_name = {
        let components: Vec<_> = Path::new(folder_path)
            .components()
            .filter_map(|c| {
                if let std::path::Component::Normal(os_str) = c {
                    os_str.to_str()
                } else {
                    None
                }
            })
            .collect();

        components
            .windows(2)
            .find(|w| w[0].eq_ignore_ascii_case("volumes"))
            .map(|w| w[1].to_string())
            .unwrap_or_else(|| {
                components
                    .get(1)
                    .or_else(|| components.first())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| "Unknown".to_string())
            })
    };

    let existing_id: Option<i64> = transaction
        .query_row(
            "SELECT id FROM folders WHERE path = ?",
            [folder_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

    if let Some(id) = existing_id {
        return Ok(Some(id));
    }

    transaction
        .execute(
            "INSERT INTO folders (path, name, volume_name, is_online, parent_id) VALUES (?, ?, ?, 1, NULL)",
            rusqlite::params![folder_path, folder_name, volume_name],
        )
        .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

    Ok(Some(transaction.last_insert_rowid()))
}

#[async_trait]
impl DBContext for SqliteDbRepository {
    async fn find_image_id_by_filename_and_hash(
        &self,
        filename: &str,
        blake3_hash: &str,
    ) -> Result<Option<i64>, DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;
        let mut stmt = db
            .prepare("SELECT id FROM images WHERE filename = ? AND blake3_hash = ?")
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        stmt.query_row((filename, blake3_hash), |row| row.get(0))
            .optional()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))
    }

    async fn insert_image_with_exif(
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

        let transaction = db
            .transaction()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let file_path_str = file
            .path
            .to_str()
            .ok_or_else(|| DiscoveryError::IoError("Invalid UTF-8 in file path".to_string()))?;
        let folder_id = get_or_create_folder_id_tx(&transaction, file_path_str)?;

        let new_image = NewImage {
            blake3_hash: blake3_hash.to_string(),
            filename: file.filename.clone(),
            extension: file.format.extension().to_string(),
            width: None,
            height: None,
            orientation: 0,
            file_size_bytes: Some(file.size_bytes as i64),
            captured_at: exif.date_taken,
            folder_id,
        };

        transaction
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
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let image_id = transaction.last_insert_rowid();

        let new_exif = if let Some(real) = real_exif {
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
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        transaction
            .execute(
                "INSERT INTO image_state (image_id, rating, flag) VALUES (?, 0, NULL)",
                rusqlite::params![image_id],
            )
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        transaction
            .commit()
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        Ok(image_id)
    }

    async fn create_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
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
        .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        Ok(())
    }

    async fn update_ingestion_session(
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
                session_id.to_string(),
            ],
        )
        .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        Ok(())
    }

    async fn complete_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
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
        .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        Ok(())
    }

    async fn get_ingestion_session_record(
        &self,
        session_id: Uuid,
    ) -> Result<Option<SessionStatsRecord>, DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        let mut stmt = db
            .prepare(
                "SELECT
                    total_files,
                    ingested_files,
                    failed_files,
                    skipped_files,
                    total_size_bytes,
                    avg_processing_time_ms
                FROM ingestion_sessions
                WHERE id = ?",
            )
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        let session_id_str = session_id.to_string();
        stmt.query_row([&session_id_str], |row| {
            Ok(SessionStatsRecord {
                total_files: row.get(0)?,
                ingested_files: row.get(1)?,
                failed_files: row.get(2)?,
                skipped_files: row.get(3)?,
                total_size_bytes: row.get(4)?,
                avg_processing_time_ms: row.get(5)?,
            })
        })
        .optional()
        .map_err(|e| DiscoveryError::IoError(e.to_string()))
    }

    async fn get_recent_import_fallback(&self) -> Result<(i64, Option<i64>), DiscoveryError> {
        let db = self
            .db
            .lock()
            .map_err(|e| DiscoveryError::IoError(format!("DB lock error: {}", e)))?;

        let mut stmt = db
            .prepare(
                "SELECT
                    COUNT(*) as total_files,
                    SUM(file_size_bytes) as total_size
                FROM images
                WHERE imported_at >= datetime('now', '-1 hour')",
            )
            .map_err(|e| DiscoveryError::IoError(e.to_string()))?;

        stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| DiscoveryError::IoError(e.to_string()))
    }
}

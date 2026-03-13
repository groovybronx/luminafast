use crate::database::Database;
use crate::models::preview::{NewPreviewRecord, PreviewCacheInfo, PreviewRecord, PreviewType};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// Errors from preview database operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PreviewDbError {
    DatabaseError {
        message: String,
    },
    PreviewNotFound {
        source_hash: String,
        preview_type: String,
    },
    InvalidRelativePath {
        path: String,
    },
    CacheStatsFailed {
        message: String,
    },
}

impl std::fmt::Display for PreviewDbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PreviewDbError::DatabaseError { message } => write!(f, "Database error: {}", message),
            PreviewDbError::PreviewNotFound {
                source_hash,
                preview_type,
            } => write!(
                f,
                "Preview not found: source_hash={}, type={}",
                source_hash, preview_type
            ),
            PreviewDbError::InvalidRelativePath { path } => {
                write!(f, "Invalid relative path: {}", path)
            }
            PreviewDbError::CacheStatsFailed { message } => {
                write!(f, "Cache stats failed: {}", message)
            }
        }
    }
}

impl std::error::Error for PreviewDbError {}

pub type PreviewDbResult<T> = Result<T, PreviewDbError>;

/// Service for preview metadata persistence in SQLite
/// Bridge between PreviewService (filesystem generation) and previews.db
pub struct PreviewDbService {
    db: Arc<Mutex<Database>>,
}

impl PreviewDbService {
    /// Create a new PreviewDbService from the shared Database
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        Self { db }
    }

    /// Insert or update a preview record after generation
    /// Upsert logic: if preview with same image_id + preview_type exists, update it
    /// Otherwise, create new record
    pub fn upsert_preview(&self, preview: NewPreviewRecord) -> PreviewDbResult<i64> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        conn.execute(
            "INSERT INTO previews (source_hash, preview_type, relative_path, file_size, width, height, generation_time, quality, access_count, last_accessed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
             ON CONFLICT(image_id, preview_type) DO UPDATE SET
               relative_path = ?3,
               file_size = ?4,
               width = ?5,
               height = ?6,
               quality = ?8,
               updated_at = datetime('now')",
            [
                preview.source_hash.as_str(),
                preview.preview_type.to_db_string(),
                preview.relative_path.as_str(),
                &preview.file_size.to_string(),
                &preview.width.to_string(),
                &preview.height.to_string(),
                "0", // generation_time will be filled by service
                &preview.jpeg_quality.to_string(),
                "0", // access_count starts at 0
            ],
        )
        .map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Failed to upsert preview: {}", e),
        })?;

        // Get the ID of the inserted/updated row
        let id: i64 = conn
            .query_row(
                "SELECT id FROM previews WHERE source_hash = ?1 AND preview_type = ?2 LIMIT 1",
                [
                    preview.source_hash.as_str(),
                    preview.preview_type.to_db_string(),
                ],
                |row| row.get(0),
            )
            .map_err(|e| PreviewDbError::DatabaseError {
                message: format!("Failed to retrieve preview ID: {}", e),
            })?;

        Ok(id)
    }

    /// Get a preview record by source_hash and preview_type
    /// Also increments access_count and updates last_accessed
    pub fn get_and_touch_preview(
        &self,
        source_hash: &str,
        preview_type: &str,
    ) -> PreviewDbResult<PreviewRecord> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        // Get the preview and increment access count in a single update
        conn.execute(
            "UPDATE previews SET access_count = access_count + 1, last_accessed = datetime('now') WHERE source_hash = ?1 AND preview_type = ?2",
            [source_hash, preview_type],
        )
        .map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Failed to update preview access: {}", e),
        })?;

        // Retrieve the updated preview
        let record = conn
            .query_row(
                "SELECT id, source_hash, preview_type, relative_path, width, height, file_size, jpeg_quality, created_at, last_accessed, access_count
                 FROM previews WHERE source_hash = ?1 AND preview_type = ?2",
                [source_hash, preview_type],
                |row| {
                    Ok(PreviewRecord {
                        id: row.get(0)?,
                        source_hash: row.get(1)?,
                        preview_type: match row.get::<_, String>(2)?.as_str() {
                            "Standard" => PreviewType::Standard,
                            "Thumbnail" => PreviewType::Thumbnail,
                            "OneToOne" => PreviewType::OneToOne,
                            other => {
                                return Err(rusqlite::Error::FromSqlConversionFailure(
                                    2,
                                    rusqlite::types::Type::Text,
                                    Box::new(std::io::Error::new(
                                        std::io::ErrorKind::InvalidData,
                                        format!("Unknown preview_type: {}", other),
                                    )),
                                ));
                            }
                        },
                        relative_path: row.get(3)?,
                        width: row.get(4)?,
                        height: row.get(5)?,
                        file_size: row.get(6)?,
                        jpeg_quality: row.get(7)?,
                        generated_at: row.get::<_, String>(8)?.parse().map_err(|_| {
                            rusqlite::Error::InvalidQuery
                        })?,
                        last_accessed: row.get::<_, String>(9)?.parse().map_err(|_| {
                            rusqlite::Error::InvalidQuery
                        })?,
                        access_count: row.get(10)?,
                    })
                },
            )
            .optional()
            .map_err(|e| PreviewDbError::DatabaseError {
                message: format!("Database query failed: {}", e),
            })?
            .ok_or(PreviewDbError::PreviewNotFound {
                source_hash: source_hash.to_string(),
                preview_type: preview_type.to_string(),
            })?;

        Ok(record)
    }

    /// Record a manual access to a preview (without retrieving full record)
    /// Increments access_count and updates last_accessed
    pub fn record_access(&self, source_hash: &str, preview_type: &str) -> PreviewDbResult<()> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        conn.execute(
            "UPDATE previews SET access_count = access_count + 1, last_accessed = datetime('now') WHERE source_hash = ?1 AND preview_type = ?2",
            [source_hash, preview_type],
        )
        .map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Failed to record preview access: {}", e),
        })?;

        Ok(())
    }

    /// Get cache statistics (total previews, total size per type)
    pub fn get_cache_stats(&self) -> PreviewDbResult<PreviewCacheInfo> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        let total_previews: i64 = conn
            .query_row("SELECT COUNT(*) FROM previews", [], |row| row.get(0))
            .map_err(|e| PreviewDbError::CacheStatsFailed {
                message: format!("Failed to count previews: {}", e),
            })?;

        let total_size: i64 = conn
            .query_row("SELECT SUM(file_size) FROM previews", [], |row| row.get(0))
            .unwrap_or(0);

        let thumbnail_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM previews WHERE preview_type = 'Thumbnail'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let preview_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM previews WHERE preview_type = 'Standard'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(PreviewCacheInfo {
            total_previews: total_previews as usize,
            total_size: total_size as u64,
            thumbnail_count: thumbnail_count as usize,
            preview_count: preview_count as usize,
            last_cleanup: None,
        })
    }

    /// Prune stale previews based on LRU criteria (age + access count)
    /// Keeps previews that have been accessed recently (last_accessed within days)
    /// or have high access counts
    pub fn prune_stale_previews(
        &self,
        days_old: i32,
        min_access_count: u64,
    ) -> PreviewDbResult<u32> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        // Remove previews older than days_old AND with fewer than min_access_count accesses
        let deleted = conn
            .execute(
                "DELETE FROM previews WHERE
                 datetime(last_accessed) < datetime('now', '-' || ? || ' days') AND
                 access_count < ?",
                [days_old.to_string(), min_access_count.to_string()],
            )
            .map_err(|e| PreviewDbError::DatabaseError {
                message: format!("Failed to prune stale previews: {}", e),
            })?;

        Ok(deleted as u32)
    }

    /// Delete a specific preview
    pub fn delete_preview(&self, source_hash: &str, preview_type: &str) -> PreviewDbResult<()> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        conn.execute(
            "DELETE FROM previews WHERE source_hash = ?1 AND preview_type = ?2",
            [source_hash, preview_type],
        )
        .map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Failed to delete preview: {}", e),
        })?;

        Ok(())
    }

    /// Get all previews for a given image_id
    pub fn get_previews_for_image(&self, image_id: i64) -> PreviewDbResult<Vec<PreviewRecord>> {
        let mut db_guard = self.db.lock().map_err(|e| PreviewDbError::DatabaseError {
            message: format!("Database lock poisoned: {}", e),
        })?;

        let conn = db_guard.connection();

        let mut stmt = conn
            .prepare(
                "SELECT id, source_hash, preview_type, relative_path, width, height, file_size, jpeg_quality, created_at, last_accessed, access_count
                 FROM previews WHERE image_id = ?1",
            )
            .map_err(|e| PreviewDbError::DatabaseError {
                message: format!("Failed to prepare query: {}", e),
            })?;

        let records = stmt
            .query_map([image_id], |row| {
                let preview_type_str = row.get::<_, String>(2)?;
                let preview_type = match preview_type_str.as_str() {
                    "Standard" => PreviewType::Standard,
                    "Thumbnail" => PreviewType::Thumbnail,
                    "OneToOne" => PreviewType::OneToOne,
                    other => {
                        return Err(rusqlite::Error::FromSqlConversionFailure(
                            2,
                            rusqlite::types::Type::Text,
                            Box::new(std::io::Error::new(
                                std::io::ErrorKind::InvalidData,
                                format!("Unknown preview_type: {}", other),
                            )),
                        ));
                    }
                };
                Ok(PreviewRecord {
                    id: row.get(0)?,
                    source_hash: row.get(1)?,
                    preview_type,
                    relative_path: row.get(3)?,
                    width: row.get(4)?,
                    height: row.get(5)?,
                    file_size: row.get(6)?,
                    jpeg_quality: row.get(7)?,
                    generated_at: row
                        .get::<_, String>(8)?
                        .parse()
                        .map_err(|_| rusqlite::Error::InvalidQuery)?,
                    last_accessed: row
                        .get::<_, String>(9)?
                        .parse()
                        .map_err(|_| rusqlite::Error::InvalidQuery)?,
                    access_count: row.get(10)?,
                })
            })
            .map_err(|e| PreviewDbError::DatabaseError {
                message: format!("Failed to query previews: {}", e),
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| PreviewDbError::DatabaseError {
                message: format!("Failed to collect preview records: {}", e),
            })?;

        Ok(records)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preview_db_error_display() {
        let error = PreviewDbError::DatabaseError {
            message: "test error".to_string(),
        };
        assert_eq!(format!("{}", error), "Database error: test error");
    }
}

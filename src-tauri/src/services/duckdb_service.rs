//! DuckDB OLAP Service — Phase 6.2
//!
//! Manages DuckDB connection pool, synchronization from SQLite, and efficient
//! analytical queries for aggregations and catalog statistics.
//!
//! The migration `008_duckdb_tracking.sql` must be applied before using this service.

use duckdb::{Connection, OptionalExt};
use rusqlite::Connection as SqliteConn;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// DTOs for external use
// ============================================================================

/// Result of a group-by aggregation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupByResult {
    pub key: String,
    pub count: i64,
    pub percentage: f64,
}

/// Catalog-wide statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogStats {
    pub total_images: i64,
    pub total_size_gb: f64,
    pub oldest_image_date: Option<String>,
    pub newest_image_date: Option<String>,
    pub average_image_size: f64,
    pub rated_images_count: i64,
    pub flagged_images_count: i64,
    pub distribution_by_rating: Vec<RatingDistribution>,
    pub distribution_by_camera: Vec<CameraDistribution>,
    pub distribution_by_iso: Vec<IsoDistribution>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatingDistribution {
    pub rating: i32,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraDistribution {
    pub camera: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IsoDistribution {
    pub iso: i32,
    pub count: i64,
}

/// Metadata for tracking DuckDB syncs
#[derive(Debug, Clone)]
pub struct DuckDBSyncMetadata {
    pub last_sync_ts: i64,
    pub total_records: i64,
    pub sync_duration_ms: u128,
}

// ============================================================================
// DuckDB Service
// ============================================================================

/// Service for DuckDB OLAP analytics and SQLite synchronization
pub struct DuckDBService {
    // Connection is wrapped in Arc<Mutex> for shared access across threads
    conn: Arc<Mutex<Connection>>,
}

impl DuckDBService {
    /// Initialize DuckDB service with in-memory database
    ///
    /// In production, use `new_with_file()` for persistence.
    pub fn new() -> Result<Self, String> {
        let conn = Connection::open_in_memory()
            .map_err(|e| format!("Failed to open DuckDB connection: {}", e))?;

        // Initialize DuckDB tables (mirrored from SQLite)
        Self::initialize_schema(&conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Initialize DuckDB service with file-based database
    ///
    /// Useful for persistence and debugging.
    pub fn new_with_file<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path = path.as_ref();
        let conn =
            Connection::open(path).map_err(|e| format!("Failed to open DuckDB file: {}", e))?;

        Self::initialize_schema(&conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Initialize DuckDB schema with mirrored tables from SQLite
    fn initialize_schema(conn: &Connection) -> Result<(), String> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY,
                filename TEXT NOT NULL,
                captured_at TEXT,
                width INTEGER,
                height INTEGER,
                file_size_bytes INTEGER,
                blake3_hash TEXT
            );

            CREATE TABLE IF NOT EXISTS exif_metadata (
                image_id INTEGER PRIMARY KEY,
                iso INTEGER,
                aperture REAL,
                focal_length REAL,
                camera_make TEXT,
                camera_model TEXT,
                lens_model TEXT,
                exposure_time REAL,
                flash_fired INTEGER
            );

            CREATE TABLE IF NOT EXISTS image_state (
                image_id INTEGER PRIMARY KEY,
                rating INTEGER,
                flag TEXT,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY,
                path TEXT NOT NULL,
                created_at TEXT
            );

            -- Create indexes for fast aggregations
            CREATE INDEX IF NOT EXISTS idx_images_captured_at ON images(captured_at);
            CREATE INDEX IF NOT EXISTS idx_exif_camera_model ON exif_metadata(camera_model);
            CREATE INDEX IF NOT EXISTS idx_exif_iso ON exif_metadata(iso);
            CREATE INDEX IF NOT EXISTS idx_image_state_rating ON image_state(rating);
            CREATE INDEX IF NOT EXISTS idx_image_state_flag ON image_state(flag);
            ",
        )
        .map_err(|e| format!("Schema initialization error: {}", e))?;

        if cfg!(debug_assertions) {
            eprintln!("[DuckDB] Schema initialized");
        }

        Ok(())
    }

    /// Synchronize images from SQLite to DuckDB (incremental if last_sync_ts exists)
    ///
    /// Returns the sync metadata (count, duration).
    pub fn sync_from_sqlite(
        &self,
        sqlite_conn: &SqliteConn,
        _last_sync_ts: Option<i64>,
    ) -> Result<DuckDBSyncMetadata, String> {
        let start_time = SystemTime::now();

        let mut duck_conn = self
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock DuckDB connection: {}", e))?;

        // Start transaction for atomic sync
        let tx = duck_conn
            .transaction()
            .map_err(|e| format!("DuckDB transaction error: {}", e))?;

        let mut total_synced = 0i64;

        // Sync images table
        let mut stmt = sqlite_conn
            .prepare(
                "SELECT id, filename, captured_at, width, height, file_size_bytes, blake3_hash
                 FROM images WHERE 1=1",
            )
            .map_err(|e| format!("SQLite prepare error: {}", e))?;

        let images_iter = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, u32>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<i32>>(3)?,
                    row.get::<_, Option<i32>>(4)?,
                    row.get::<_, Option<i64>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                ))
            })
            .map_err(|e| format!("SQLite query error: {}", e))?;

        for img_row in images_iter {
            let (id, filename, captured_at, width, height, file_size, hash) =
                img_row.map_err(|e| format!("Row error: {}", e))?;

            tx.execute(
                "INSERT OR REPLACE INTO images (id, filename, captured_at, width, height, file_size_bytes, blake3_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                duckdb::params!(
                    id as i64,
                    &filename,
                    &captured_at,
                    width,
                    height,
                    file_size,
                    hash
                ),
            )
            .map_err(|e| format!("DuckDB insert error: {}", e))?;

            total_synced += 1;
        }

        // Sync exif_metadata table
        let mut exif_stmt = sqlite_conn
            .prepare(
                "SELECT image_id, iso, aperture, focal_length, camera_make, camera_model, lens, shutter_speed
                 FROM exif_metadata WHERE 1=1",
            )
            .map_err(|e| format!("EXIF prepare error: {}", e))?;

        let exif_iter = exif_stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, u32>(0)?,
                    row.get::<_, Option<i32>>(1)?,
                    row.get::<_, Option<f64>>(2)?,
                    row.get::<_, Option<f64>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<f64>>(7)?,
                ))
            })
            .map_err(|e| format!("EXIF query error: {}", e))?;

        for exif_row in exif_iter {
            let (
                image_id,
                iso,
                aperture,
                focal_length,
                camera_make,
                camera_model,
                lens,
                shutter_speed,
            ) = exif_row.map_err(|e| format!("EXIF row error: {}", e))?;

            tx.execute(
                "INSERT OR REPLACE INTO exif_metadata (image_id, iso, aperture, focal_length, camera_make, camera_model, lens_model, exposure_time, flash_fired)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                duckdb::params!(
                    image_id as i64,
                    iso,
                    aperture,
                    focal_length,
                    camera_make,
                    camera_model,
                    lens,                  // SQLite.lens → DuckDB.lens_model
                    shutter_speed,         // SQLite.shutter_speed → DuckDB.exposure_time
                    0i32                   // Default: no flash info in SQLite
                ),
            )
            .map_err(|e| format!("DuckDB EXIF insert error: {}", e))?;
        }

        // Sync image_state table
        let mut state_stmt = sqlite_conn
            .prepare(
                "SELECT image_id, rating, flag, created_at, updated_at
                 FROM image_state WHERE 1=1",
            )
            .map_err(|e| format!("State prepare error: {}", e))?;

        let state_iter = state_stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, u32>(0)?,
                    row.get::<_, Option<i32>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                ))
            })
            .map_err(|e| format!("State query error: {}", e))?;

        for state_row in state_iter {
            let (image_id, rating, flag, created_at, updated_at) =
                state_row.map_err(|e| format!("State row error: {}", e))?;

            tx.execute(
                "INSERT OR REPLACE INTO image_state (image_id, rating, flag, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)",
                duckdb::params!(
                    image_id as i64,
                    rating,
                    flag,
                    created_at,
                    updated_at
                ),
            )
            .map_err(|e| format!("DuckDB state insert error: {}", e))?;
        }

        drop(tx); // Explicitly drop transaction before releasing connection

        let elapsed = start_time
            .elapsed()
            .map_err(|e| format!("Time error: {}", e))?
            .as_millis();

        if cfg!(debug_assertions) {
            eprintln!("[DuckDB] Synced {} records in {}ms", total_synced, elapsed);
        }

        Ok(DuckDBSyncMetadata {
            last_sync_ts: now_unix(),
            total_records: total_synced,
            sync_duration_ms: elapsed,
        })
    }

    /// Execute aggregation query on DuckDB
    ///
    /// Supported group_by values: "month", "camera", "iso", "rating"
    pub fn execute_aggregation(&self, group_by: &str) -> Result<Vec<GroupByResult>, String> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock DuckDB connection: {}", e))?;

        let query = match group_by {
            "month" => {
                "SELECT strftime(CAST(images.captured_at AS TIMESTAMP), '%Y-%m') as key,
                        COUNT(*) as count
                 FROM images
                 WHERE images.captured_at IS NOT NULL
                 GROUP BY key
                 ORDER BY key DESC"
            }
            "camera" => {
                "SELECT COALESCE(exif_metadata.camera_model, 'Unknown') as key,
                        COUNT(*) as count
                 FROM images
                 LEFT JOIN exif_metadata ON images.id = exif_metadata.image_id
                 GROUP BY key
                 ORDER BY count DESC"
            }
            "iso" => {
                "SELECT CAST(COALESCE(exif_metadata.iso, 0) AS VARCHAR) as key,
                        COUNT(*) as count
                 FROM images
                 LEFT JOIN exif_metadata ON images.id = exif_metadata.image_id
                 GROUP BY exif_metadata.iso
                 ORDER BY exif_metadata.iso ASC"
            }
            "rating" => {
                "SELECT CAST(COALESCE(image_state.rating, 0) AS VARCHAR) as key,
                        COUNT(*) as count
                 FROM images
                 LEFT JOIN image_state ON images.id = image_state.image_id
                 GROUP BY image_state.rating
                 ORDER BY image_state.rating ASC"
            }
            _ => {
                return Err(format!(
                    "Invalid group_by value: {}. Expected: month, camera, iso, rating",
                    group_by
                ))
            }
        };

        let mut stmt = conn
            .prepare(query)
            .map_err(|e| format!("DuckDB prepare error: {}", e))?;

        // Get total count for percentage calculation
        let total_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM images", [], |row| row.get(0))
            .optional()
            .map_err(|e| format!("Total count error: {}", e))?
            .unwrap_or(0);

        let results = stmt
            .query_map([], |row| {
                let key: String = row.get(0)?;
                let count: i64 = row.get(1)?;
                Ok((key, count))
            })
            .map_err(|e| format!("DuckDB query error: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row collection error: {}", e))?;

        Ok(results
            .into_iter()
            .map(|(key, count)| {
                let percentage = if total_count > 0 {
                    (count as f64 / total_count as f64) * 100.0
                } else {
                    0.0
                };
                GroupByResult {
                    key,
                    count,
                    percentage,
                }
            })
            .collect())
    }

    /// Get catalog-wide statistics
    pub fn get_catalog_stats(&self) -> Result<CatalogStats, String> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock DuckDB connection: {}", e))?;

        // Total images
        let total_images: i64 = conn
            .query_row("SELECT COUNT(*) FROM images", [], |row| row.get(0))
            .optional()
            .map_err(|e| format!("Total count error: {}", e))?
            .unwrap_or(0);

        // Total size (GB)
        let total_size_bytes: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(file_size_bytes), 0) FROM images",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Size sum error: {}", e))?
            .unwrap_or(0);

        let total_size_gb = total_size_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

        // Average image size
        let average_image_size = if total_images > 0 {
            total_size_bytes as f64 / total_images as f64
        } else {
            0.0
        };

        // Date range
        let (oldest_date, newest_date): (Option<String>, Option<String>) = conn
            .query_row(
                "SELECT MIN(captured_at), MAX(captured_at) FROM images",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|e| format!("Date range error: {}", e))?
            .unwrap_or((None, None));

        // Rated/flagged counts
        let rated_images_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM image_state WHERE rating IS NOT NULL AND rating > 0",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Rated count error: {}", e))?
            .unwrap_or(0);

        let flagged_images_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM image_state WHERE flag IS NOT NULL",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Flagged count error: {}", e))?
            .unwrap_or(0);

        // Distributions
        let mut rating_dist_stmt = conn
            .prepare(
                "SELECT COALESCE(rating, 0) as rating, COUNT(*) as count
                 FROM image_state
                 GROUP BY rating
                 ORDER BY rating ASC",
            )
            .map_err(|e| format!("Rating dist prepare error: {}", e))?;

        let distribution_by_rating = rating_dist_stmt
            .query_map([], |row| {
                Ok(RatingDistribution {
                    rating: row.get(0)?,
                    count: row.get(1)?,
                })
            })
            .map_err(|e| format!("Rating dist query error: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Rating dist collect error: {}", e))?;

        let mut camera_dist_stmt = conn
            .prepare(
                "SELECT COALESCE(camera_model, 'Unknown') as camera, COUNT(*) as count
                 FROM exif_metadata
                 GROUP BY camera_model
                 ORDER BY count DESC
                 LIMIT 20",
            )
            .map_err(|e| format!("Camera dist prepare error: {}", e))?;

        let distribution_by_camera = camera_dist_stmt
            .query_map([], |row| {
                Ok(CameraDistribution {
                    camera: row.get(0)?,
                    count: row.get(1)?,
                })
            })
            .map_err(|e| format!("Camera dist query error: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Camera dist collect error: {}", e))?;

        let mut iso_dist_stmt = conn
            .prepare(
                "SELECT COALESCE(iso, 0) as iso, COUNT(*) as count
                 FROM exif_metadata
                 GROUP BY iso
                 ORDER BY iso ASC",
            )
            .map_err(|e| format!("ISO dist prepare error: {}", e))?;

        let distribution_by_iso = iso_dist_stmt
            .query_map([], |row| {
                Ok(IsoDistribution {
                    iso: row.get(0)?,
                    count: row.get(1)?,
                })
            })
            .map_err(|e| format!("ISO dist query error: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("ISO dist collect error: {}", e))?;

        Ok(CatalogStats {
            total_images,
            total_size_gb,
            oldest_image_date: oldest_date,
            newest_image_date: newest_date,
            average_image_size,
            rated_images_count,
            flagged_images_count,
            distribution_by_rating,
            distribution_by_camera,
            distribution_by_iso,
        })
    }
}

// Helper function for Unix timestamp
fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_duckdb_initialization() {
        let service = DuckDBService::new();
        assert!(service.is_ok(), "DuckDB service initialization failed");
    }

    #[test]
    fn test_schema_creation() {
        let service = DuckDBService::new().expect("Service creation failed");
        let conn = service.conn.lock().expect("Failed to lock connection");

        let table_exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'images')",
                [],
                |row| row.get(0),
            )
            .expect("Query failed");

        assert!(table_exists, "Images table not created");
    }

    #[test]
    fn test_empty_catalog_stats() {
        let service = DuckDBService::new().expect("Service creation failed");
        let stats = service
            .get_catalog_stats()
            .expect("get_catalog_stats failed");

        assert_eq!(stats.total_images, 0);
        assert_eq!(stats.total_size_gb, 0.0);
        assert_eq!(stats.rated_images_count, 0);
    }

    #[test]
    fn test_aggregation_empty_database() {
        let service = DuckDBService::new().expect("Service creation failed");
        let results = service
            .execute_aggregation("month")
            .expect("Aggregation failed");

        assert!(
            results.is_empty(),
            "Expected empty results for empty database"
        );
    }

    #[test]
    fn test_invalid_group_by() {
        let service = DuckDBService::new().expect("Service creation failed");
        let result = service.execute_aggregation("invalid_column");

        assert!(
            result.is_err(),
            "Expected error for invalid group_by parameter"
        );
    }
}

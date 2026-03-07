//! Cache Metadata Service — Phase 6.1 Completion
//!
//! Manages the `cache_metadata` and `cache_statistics` tables for
//! persistent cache tracking and warm-startup optimization.
//!
//! The migration `007_cache_metadata.sql` must be applied before using this service.

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

/// Raw row from the `cache_metadata` table.
pub struct CacheMetadataRow {
    pub image_id: u32,
    pub cached_at: i64,
    pub last_accessed: i64,
    pub size_bytes: u64,
    pub source: String,
    pub invalidated_at: Option<i64>,
}

/// DTO returned to Tauri callers.
#[derive(Debug, Serialize, Deserialize)]
pub struct CacheMetadataDTO {
    pub image_id: u32,
    pub cached_at: i64,
    pub last_accessed: i64,
    pub size_bytes: u64,
    pub source: String,
    pub is_valid: bool,
}

impl From<CacheMetadataRow> for CacheMetadataDTO {
    fn from(row: CacheMetadataRow) -> Self {
        Self {
            image_id: row.image_id,
            cached_at: row.cached_at,
            last_accessed: row.last_accessed,
            size_bytes: row.size_bytes,
            source: row.source,
            is_valid: row.invalidated_at.is_none(),
        }
    }
}

/// Result DTO for `warm_cache_from_db` command.
#[derive(Debug, Serialize, Deserialize)]
pub struct WarmCacheResult {
    pub warmed_count: u32,
    pub skipped_count: u32,
    pub total_candidates: u32,
    pub elapsed_ms: u128,
}

/// Service for managing cache metadata in SQLite.
pub struct CacheMetadataService;

impl CacheMetadataService {
    /// Upsert or refresh cache metadata for an image.
    ///
    /// On conflict (same `image_id`): updates `last_accessed`, `size_bytes`,
    /// `source`, and clears any `invalidated_at` flag (marks entry as valid).
    pub fn upsert(
        conn: &Connection,
        image_id: u32,
        size_bytes: u64,
        source: &str,
    ) -> Result<(), String> {
        let now = now_unix();

        conn.execute(
            "INSERT INTO cache_metadata (image_id, cached_at, last_accessed, size_bytes, source)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(image_id) DO UPDATE SET
               last_accessed  = excluded.last_accessed,
               size_bytes     = excluded.size_bytes,
               source         = excluded.source,
               invalidated_at = NULL",
            rusqlite::params![image_id as i64, now, now, size_bytes as i64, source],
        )
        .map_err(|e| format!("Cache metadata upsert error: {}", e))?;

        Ok(())
    }

    /// Retrieve cache metadata for a single image.
    ///
    /// Returns `None` when no record is found.
    pub fn get(conn: &Connection, image_id: u32) -> Result<Option<CacheMetadataRow>, String> {
        let result = conn.query_row(
            "SELECT image_id, cached_at, last_accessed, size_bytes, source, invalidated_at
             FROM cache_metadata
             WHERE image_id = ?1",
            [image_id as i64],
            |row| {
                Ok(CacheMetadataRow {
                    image_id: row.get::<_, i64>(0)? as u32,
                    cached_at: row.get(1)?,
                    last_accessed: row.get(2)?,
                    size_bytes: row.get::<_, i64>(3)? as u64,
                    source: row.get(4)?,
                    invalidated_at: row.get(5)?,
                })
            },
        );

        match result {
            Ok(row) => Ok(Some(row)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Cache metadata get error: {}", e)),
        }
    }

    /// Return the IDs of the most recently accessed images for cache warm-start,
    /// ordered by `last_accessed DESC`, excluding any invalidated entries.
    pub fn get_recently_accessed(conn: &Connection, limit: usize) -> Result<Vec<u32>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT image_id FROM cache_metadata
                 WHERE invalidated_at IS NULL
                 ORDER BY last_accessed DESC
                 LIMIT ?1",
            )
            .map_err(|e| format!("Prepare recently_accessed error: {}", e))?;

        let ids = stmt
            .query_map([limit as i64], |row| {
                row.get::<_, i64>(0).map(|id| id as u32)
            })
            .map_err(|e| format!("Query recently_accessed error: {}", e))?
            .collect::<Result<Vec<u32>, _>>()
            .map_err(|e| format!("Row recently_accessed error: {}", e))?;

        Ok(ids)
    }

    /// Mark a cache entry as invalidated by setting `invalidated_at` to now.
    ///
    /// Does nothing (no-op) when the image has no metadata record.
    pub fn invalidate(conn: &Connection, image_id: u32) -> Result<(), String> {
        let now = now_unix();

        conn.execute(
            "UPDATE cache_metadata SET invalidated_at = ?1 WHERE image_id = ?2",
            rusqlite::params![now, image_id as i64],
        )
        .map_err(|e| format!("Cache metadata invalidate error: {}", e))?;

        Ok(())
    }

    /// Persist a point-in-time snapshot of cache statistics for monitoring.
    #[allow(clippy::too_many_arguments)]
    pub fn snapshot_stats(
        conn: &Connection,
        l1_size: usize,
        l1_capacity: usize,
        l1_hits: u64,
        l1_misses: u64,
        l2_size: usize,
        l2_disk_usage: u64,
        l2_hits: u64,
        l2_misses: u64,
    ) -> Result<(), String> {
        let now = now_unix();

        conn.execute(
            "INSERT INTO cache_statistics
             (timestamp, l1_size, l1_capacity, l1_hits, l1_misses,
              l2_size, l2_disk_usage_bytes, l2_hits, l2_misses)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                now,
                l1_size as i64,
                l1_capacity as i64,
                l1_hits as i64,
                l1_misses as i64,
                l2_size as i64,
                l2_disk_usage as i64,
                l2_hits as i64,
                l2_misses as i64,
            ],
        )
        .map_err(|e| format!("Cache stats snapshot error: {}", e))?;

        Ok(())
    }
}

/// Return the current Unix timestamp in seconds.
fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Create a minimal in-memory DB for testing (no FK enforcement by default in SQLite).
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory DB");
        conn.execute_batch(
            "CREATE TABLE cache_metadata (
                 image_id       INTEGER PRIMARY KEY,
                 cached_at      INTEGER NOT NULL,
                 last_accessed  INTEGER NOT NULL,
                 size_bytes     INTEGER NOT NULL,
                 source         TEXT    NOT NULL DEFAULT 'L2',
                 invalidated_at INTEGER,
                 created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
             );
             CREATE TABLE cache_statistics (
                 id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                 timestamp           INTEGER NOT NULL,
                 l1_size             INTEGER NOT NULL,
                 l1_capacity         INTEGER NOT NULL,
                 l1_hits             INTEGER NOT NULL,
                 l1_misses           INTEGER NOT NULL,
                 l2_size             INTEGER NOT NULL,
                 l2_disk_usage_bytes INTEGER NOT NULL,
                 l2_hits             INTEGER NOT NULL,
                 l2_misses           INTEGER NOT NULL,
                 created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
             );",
        )
        .expect("Failed to create test tables");
        conn
    }

    #[test]
    fn test_upsert_creates_record() {
        let conn = create_test_db();

        CacheMetadataService::upsert(&conn, 1, 1024, "L2").expect("Failed to upsert");

        let row = CacheMetadataService::get(&conn, 1)
            .expect("Failed to get")
            .expect("No record found");

        assert_eq!(row.image_id, 1);
        assert_eq!(row.size_bytes, 1024);
        assert_eq!(row.source, "L2");
        assert!(row.invalidated_at.is_none(), "Should not be invalidated");
    }

    #[test]
    fn test_upsert_updates_existing_record() {
        let conn = create_test_db();

        CacheMetadataService::upsert(&conn, 42, 2048, "L2").expect("first upsert");
        CacheMetadataService::upsert(&conn, 42, 4096, "L1").expect("second upsert");

        let row = CacheMetadataService::get(&conn, 42)
            .expect("Failed to get")
            .expect("No record found");

        assert_eq!(row.size_bytes, 4096, "size_bytes should be updated");
        assert_eq!(row.source, "L1", "source should be updated");
    }

    #[test]
    fn test_get_nonexistent_returns_none() {
        let conn = create_test_db();
        let result = CacheMetadataService::get(&conn, 999).expect("Failed to get");
        assert!(result.is_none());
    }

    #[test]
    fn test_invalidate_sets_timestamp() {
        let conn = create_test_db();

        CacheMetadataService::upsert(&conn, 7, 512, "L1").expect("Failed to upsert");
        CacheMetadataService::invalidate(&conn, 7).expect("Failed to invalidate");

        let row = CacheMetadataService::get(&conn, 7)
            .expect("Failed to get")
            .expect("No record found");

        assert!(row.invalidated_at.is_some(), "invalidated_at should be set");
    }

    #[test]
    fn test_upsert_clears_invalidated_flag() {
        let conn = create_test_db();

        CacheMetadataService::upsert(&conn, 5, 100, "L2").expect("initial upsert");
        CacheMetadataService::invalidate(&conn, 5).expect("invalidate");

        // Re-upsert must clear the invalidated_at flag
        CacheMetadataService::upsert(&conn, 5, 200, "L2").expect("re-upsert");

        let row = CacheMetadataService::get(&conn, 5)
            .expect("Failed to get")
            .expect("No record found");

        assert!(
            row.invalidated_at.is_none(),
            "invalidated_at should be cleared after re-upsert"
        );
    }

    #[test]
    fn test_get_recently_accessed_returns_ordered_ids() {
        let conn = create_test_db();

        // Manually insert with controlled timestamps
        conn.execute(
            "INSERT INTO cache_metadata (image_id, cached_at, last_accessed, size_bytes, source)
             VALUES (1, 100, 100, 1024, 'L2')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO cache_metadata (image_id, cached_at, last_accessed, size_bytes, source)
             VALUES (2, 200, 300, 2048, 'L1')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO cache_metadata (image_id, cached_at, last_accessed, size_bytes, source)
             VALUES (3, 50, 50, 512, 'L2')",
            [],
        )
        .unwrap();

        let ids =
            CacheMetadataService::get_recently_accessed(&conn, 2).expect("Failed to get recent");

        // Most recent first: 2 (300), then 1 (100)
        assert_eq!(ids.len(), 2);
        assert_eq!(ids[0], 2, "Image 2 should be first (most recent)");
        assert_eq!(ids[1], 1, "Image 1 should be second");
    }

    #[test]
    fn test_get_recently_accessed_excludes_invalidated() {
        let conn = create_test_db();

        CacheMetadataService::upsert(&conn, 10, 100, "L2").expect("upsert 10");
        CacheMetadataService::upsert(&conn, 11, 100, "L2").expect("upsert 11");
        CacheMetadataService::invalidate(&conn, 10).expect("invalidate 10");

        let ids =
            CacheMetadataService::get_recently_accessed(&conn, 10).expect("Failed to get recent");

        // Only image 11 should appear; 10 is invalidated
        assert!(!ids.contains(&10), "Invalidated image 10 should not appear");
        assert!(ids.contains(&11), "Valid image 11 should appear");
    }

    #[test]
    fn test_snapshot_stats_inserts_row() {
        let conn = create_test_db();

        CacheMetadataService::snapshot_stats(&conn, 10, 500, 100, 20, 5, 1024 * 1024, 30, 10)
            .expect("Failed to snapshot");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM cache_statistics", [], |row| {
                row.get(0)
            })
            .unwrap();

        assert_eq!(count, 1);
    }

    #[test]
    fn test_dto_is_valid_flag() {
        let row_valid = CacheMetadataRow {
            image_id: 1,
            cached_at: 0,
            last_accessed: 0,
            size_bytes: 100,
            source: "L2".into(),
            invalidated_at: None,
        };
        let dto: CacheMetadataDTO = row_valid.into();
        assert!(dto.is_valid);

        let row_invalid = CacheMetadataRow {
            image_id: 2,
            cached_at: 0,
            last_accessed: 0,
            size_bytes: 100,
            source: "L1".into(),
            invalidated_at: Some(999),
        };
        let dto: CacheMetadataDTO = row_invalid.into();
        assert!(!dto.is_valid);
    }
}

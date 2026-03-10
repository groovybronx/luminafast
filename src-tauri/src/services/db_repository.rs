use crate::models::catalog::{NewExifMetadata, NewImage};
use crate::models::discovery::{BasicExif, DiscoveredFile, DiscoveryError};
use crate::models::exif::ExifMetadata;
use crate::types::db_context::{DBContext, DbPoolMetrics, SessionStatsRecord, SessionStatsUpdate};
use async_trait::async_trait;
use r2d2::{CustomizeConnection, Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{ErrorCode, OptionalExtension};
use std::ops::{Deref, DerefMut};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};
use uuid::Uuid;

const DEFAULT_POOL_MAX_CONNECTIONS: u32 = 12;
const DEFAULT_POOL_MIN_CONNECTIONS: u32 = 2;
const DEFAULT_POOL_ACQUIRE_TIMEOUT_MS: u64 = 1_500;
const DEFAULT_SQLITE_BUSY_TIMEOUT_MS: u64 = 750;
const DEFAULT_RETRY_MAX_ATTEMPTS: u32 = 3;
const DEFAULT_RETRY_BACKOFF_MS: u64 = 25;

#[derive(Debug, Clone)]
pub struct SqlitePoolConfig {
    pub max_connections: u32,
    pub min_connections: u32,
    pub acquire_timeout: Duration,
    pub busy_timeout: Duration,
    pub max_retry_attempts: u32,
    pub retry_backoff: Duration,
}

impl Default for SqlitePoolConfig {
    fn default() -> Self {
        Self {
            max_connections: DEFAULT_POOL_MAX_CONNECTIONS,
            min_connections: DEFAULT_POOL_MIN_CONNECTIONS,
            acquire_timeout: Duration::from_millis(DEFAULT_POOL_ACQUIRE_TIMEOUT_MS),
            busy_timeout: Duration::from_millis(DEFAULT_SQLITE_BUSY_TIMEOUT_MS),
            max_retry_attempts: DEFAULT_RETRY_MAX_ATTEMPTS,
            retry_backoff: Duration::from_millis(DEFAULT_RETRY_BACKOFF_MS),
        }
    }
}

impl SqlitePoolConfig {
    pub fn from_env() -> Self {
        fn parse_u32(key: &str, default: u32) -> u32 {
            match std::env::var(key) {
                Ok(value) => match value.parse::<u32>() {
                    Ok(parsed) => parsed,
                    Err(_) => {
                        log::warn!("Invalid env {}='{}', using default {}", key, value, default);
                        default
                    }
                },
                Err(_) => default,
            }
        }

        fn parse_duration_ms(key: &str, default: Duration) -> Duration {
            match std::env::var(key) {
                Ok(value) => match value.parse::<u64>() {
                    Ok(parsed) => Duration::from_millis(parsed),
                    Err(_) => {
                        log::warn!(
                            "Invalid env {}='{}', using default {}ms",
                            key,
                            value,
                            default.as_millis()
                        );
                        default
                    }
                },
                Err(_) => default,
            }
        }

        let mut config = Self {
            max_connections: parse_u32(
                "LUMINAFAST_DB_POOL_MAX_CONNECTIONS",
                DEFAULT_POOL_MAX_CONNECTIONS,
            ),
            min_connections: parse_u32(
                "LUMINAFAST_DB_POOL_MIN_CONNECTIONS",
                DEFAULT_POOL_MIN_CONNECTIONS,
            ),
            acquire_timeout: parse_duration_ms(
                "LUMINAFAST_DB_POOL_ACQUIRE_TIMEOUT_MS",
                Duration::from_millis(DEFAULT_POOL_ACQUIRE_TIMEOUT_MS),
            ),
            busy_timeout: parse_duration_ms(
                "LUMINAFAST_DB_POOL_BUSY_TIMEOUT_MS",
                Duration::from_millis(DEFAULT_SQLITE_BUSY_TIMEOUT_MS),
            ),
            max_retry_attempts: parse_u32(
                "LUMINAFAST_DB_POOL_RETRY_MAX_ATTEMPTS",
                DEFAULT_RETRY_MAX_ATTEMPTS,
            ),
            retry_backoff: parse_duration_ms(
                "LUMINAFAST_DB_POOL_RETRY_BACKOFF_MS",
                Duration::from_millis(DEFAULT_RETRY_BACKOFF_MS),
            ),
        };

        if config.max_connections == 0 {
            config.max_connections = 1;
            log::warn!("LUMINAFAST_DB_POOL_MAX_CONNECTIONS=0 is invalid, forcing to 1");
        }
        if config.min_connections > config.max_connections {
            log::warn!(
                "LUMINAFAST_DB_POOL_MIN_CONNECTIONS ({}) > max ({}), clamping",
                config.min_connections,
                config.max_connections
            );
            config.min_connections = config.max_connections;
        }

        config
    }
}

#[derive(Debug)]
enum RepositoryBackend {
    Shared(Arc<Mutex<rusqlite::Connection>>),
    Pooled(Pool<SqliteConnectionManager>),
}

#[derive(Debug, Default)]
struct PoolMetricsTracker {
    acquire_count: AtomicU64,
    acquire_timeout_count: AtomicU64,
    retry_count: AtomicU64,
    total_acquire_wait_ms: AtomicU64,
}

impl PoolMetricsTracker {
    fn record_acquire(&self, wait: Duration) {
        self.acquire_count.fetch_add(1, Ordering::Relaxed);
        self.total_acquire_wait_ms
            .fetch_add(wait.as_millis() as u64, Ordering::Relaxed);
    }

    fn record_acquire_timeout(&self) {
        self.acquire_timeout_count.fetch_add(1, Ordering::Relaxed);
    }

    fn record_retry(&self) {
        self.retry_count.fetch_add(1, Ordering::Relaxed);
    }

    fn snapshot(&self, total_connections: u32, idle_connections: u32) -> DbPoolMetrics {
        let acquire_count = self.acquire_count.load(Ordering::Relaxed);
        let total_wait_ms = self.total_acquire_wait_ms.load(Ordering::Relaxed);

        DbPoolMetrics {
            total_connections,
            idle_connections,
            in_use_connections: total_connections.saturating_sub(idle_connections),
            acquire_count,
            acquire_timeout_count: self.acquire_timeout_count.load(Ordering::Relaxed),
            retry_count: self.retry_count.load(Ordering::Relaxed),
            total_acquire_wait_ms: total_wait_ms,
            avg_acquire_wait_ms: if acquire_count == 0 {
                0.0
            } else {
                total_wait_ms as f64 / acquire_count as f64
            },
        }
    }
}

#[derive(Debug)]
struct SqliteConnectionCustomizer {
    busy_timeout: Duration,
}

impl CustomizeConnection<rusqlite::Connection, rusqlite::Error> for SqliteConnectionCustomizer {
    fn on_acquire(&self, conn: &mut rusqlite::Connection) -> Result<(), rusqlite::Error> {
        conn.busy_timeout(self.busy_timeout)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        conn.pragma_update(None, "temp_store", "memory")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        Ok(())
    }
}

pub struct SqliteDbRepository {
    backend: RepositoryBackend,
    pool_config: SqlitePoolConfig,
    metrics: Arc<PoolMetricsTracker>,
}

enum ConnectionHandle<'a> {
    Shared(MutexGuard<'a, rusqlite::Connection>),
    Pooled(PooledConnection<SqliteConnectionManager>),
}

impl Deref for ConnectionHandle<'_> {
    type Target = rusqlite::Connection;

    fn deref(&self) -> &Self::Target {
        match self {
            Self::Shared(guard) => guard,
            Self::Pooled(connection) => connection,
        }
    }
}

impl DerefMut for ConnectionHandle<'_> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        match self {
            Self::Shared(guard) => guard,
            Self::Pooled(connection) => connection,
        }
    }
}

fn ensure_ingestion_tracking_schema(db: &rusqlite::Connection) -> rusqlite::Result<()> {
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS ingestion_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            status TEXT CHECK(status IN ('scanning','ingesting','completed','error','stopped')) DEFAULT 'scanning',
            total_files INTEGER DEFAULT 0,
            ingested_files INTEGER DEFAULT 0,
            failed_files INTEGER DEFAULT 0,
            skipped_files INTEGER DEFAULT 0,
            total_size_bytes INTEGER DEFAULT 0,
            avg_processing_time_ms REAL DEFAULT 0.0,
            error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS ingestion_file_status (
            id INTEGER PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES ingestion_sessions(id) ON DELETE CASCADE,
            file_path TEXT NOT NULL,
            blake3_hash TEXT,
            status TEXT CHECK(status IN ('pending','processing','ingested','failed','skipped')) DEFAULT 'pending',
            processing_time_ms INTEGER DEFAULT 0,
            error_message TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_status ON ingestion_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_started_at ON ingestion_sessions(started_at);
        CREATE INDEX IF NOT EXISTS idx_ingestion_file_status_session_id ON ingestion_file_status(session_id);
        CREATE INDEX IF NOT EXISTS idx_ingestion_file_status_status ON ingestion_file_status(status);
        CREATE INDEX IF NOT EXISTS idx_ingestion_file_status_blake3_hash ON ingestion_file_status(blake3_hash);",
    )
}

pub fn get_or_create_folder_id_tx(
    transaction: &rusqlite::Transaction<'_>,
    file_path: &str,
) -> rusqlite::Result<Option<i64>> {
    let path = Path::new(file_path);
    let folder_path = match path.parent() {
        Some(parent) => match parent.to_str() {
            Some(path_str) => path_str,
            None => return Ok(None),
        },
        None => return Ok(None),
    };

    let folder_name = Path::new(folder_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("")
        .to_string();

    let volume_name = {
        let components: Vec<_> = Path::new(folder_path)
            .components()
            .filter_map(|component| {
                if let std::path::Component::Normal(os_str) = component {
                    os_str.to_str()
                } else {
                    None
                }
            })
            .collect();

        components
            .windows(2)
            .find(|window| window[0].eq_ignore_ascii_case("volumes"))
            .map(|window| window[1].to_string())
            .unwrap_or_else(|| {
                components
                    .get(1)
                    .or_else(|| components.first())
                    .map(|name| name.to_string())
                    .unwrap_or_else(|| "Unknown".to_string())
            })
    };

    let existing_id: Option<i64> = transaction
        .query_row(
            "SELECT id FROM folders WHERE path = ?",
            [folder_path],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(id) = existing_id {
        return Ok(Some(id));
    }

    transaction.execute(
        "INSERT INTO folders (path, name, volume_name, is_online, parent_id) VALUES (?, ?, ?, 1, NULL)",
        rusqlite::params![folder_path, folder_name, volume_name],
    )?;

    Ok(Some(transaction.last_insert_rowid()))
}

impl SqliteDbRepository {
    pub fn new(db: Arc<Mutex<rusqlite::Connection>>) -> Self {
        Self {
            backend: RepositoryBackend::Shared(db),
            pool_config: SqlitePoolConfig::default(),
            metrics: Arc::new(PoolMetricsTracker::default()),
        }
    }

    pub fn from_db_path(db_path: impl AsRef<Path>) -> Result<Self, DiscoveryError> {
        Self::from_db_path_with_config(db_path, SqlitePoolConfig::from_env())
    }

    pub fn from_db_path_with_config(
        db_path: impl AsRef<Path>,
        config: SqlitePoolConfig,
    ) -> Result<Self, DiscoveryError> {
        let db_path_buf: PathBuf = db_path.as_ref().to_path_buf();
        let customizer = SqliteConnectionCustomizer {
            busy_timeout: config.busy_timeout,
        };

        let manager = SqliteConnectionManager::file(db_path_buf.clone());
        let pool = Pool::builder()
            .max_size(config.max_connections)
            .min_idle(Some(config.min_connections))
            .connection_timeout(config.acquire_timeout)
            .test_on_check_out(true)
            .connection_customizer(Box::new(customizer))
            .build(manager)
            .map_err(|error| {
                DiscoveryError::IoError(format!(
                    "Failed to build SQLite connection pool for {}: {}",
                    db_path_buf.display(),
                    error
                ))
            })?;

        Ok(Self {
            backend: RepositoryBackend::Pooled(pool),
            pool_config: config,
            metrics: Arc::new(PoolMetricsTracker::default()),
        })
    }

    pub fn pool_metrics(&self) -> Option<DbPoolMetrics> {
        match &self.backend {
            RepositoryBackend::Pooled(pool) => {
                let state = pool.state();
                Some(
                    self.metrics
                        .snapshot(state.connections, state.idle_connections),
                )
            }
            RepositoryBackend::Shared(_) => None,
        }
    }

    pub fn shared_connection(&self) -> Option<Arc<Mutex<rusqlite::Connection>>> {
        match &self.backend {
            RepositoryBackend::Shared(db) => Some(Arc::clone(db)),
            RepositoryBackend::Pooled(_) => None,
        }
    }

    fn acquire_connection(&self) -> Result<ConnectionHandle<'_>, DiscoveryError> {
        match &self.backend {
            RepositoryBackend::Shared(db) => {
                let guard = db.lock().map_err(|error| {
                    DiscoveryError::IoError(format!("DB lock error: {}", error))
                })?;
                Ok(ConnectionHandle::Shared(guard))
            }
            RepositoryBackend::Pooled(pool) => {
                let wait_start = Instant::now();
                match pool.get_timeout(self.pool_config.acquire_timeout) {
                    Ok(connection) => {
                        self.metrics.record_acquire(wait_start.elapsed());
                        Ok(ConnectionHandle::Pooled(connection))
                    }
                    Err(error) => {
                        let message = error.to_string();
                        if message.to_ascii_lowercase().contains("timed out") {
                            self.metrics.record_acquire_timeout();
                        }
                        Err(DiscoveryError::IoError(format!(
                            "Failed to acquire pooled SQLite connection: {}",
                            message
                        )))
                    }
                }
            }
        }
    }

    fn execute_with_retry<T, F>(&self, mut operation: F) -> Result<T, DiscoveryError>
    where
        F: FnMut(&mut rusqlite::Connection) -> rusqlite::Result<T>,
    {
        let mut attempt: u32 = 0;

        loop {
            let mut connection = self.acquire_connection()?;
            match operation(&mut connection) {
                Ok(value) => return Ok(value),
                Err(error)
                    if Self::is_transient_lock_error(&error)
                        && attempt < self.pool_config.max_retry_attempts =>
                {
                    attempt += 1;
                    self.metrics.record_retry();

                    let backoff_ms =
                        self.pool_config.retry_backoff.as_millis() as u64 * u64::from(attempt);
                    thread::sleep(Duration::from_millis(backoff_ms.max(1)));
                }
                Err(error) => return Err(DiscoveryError::IoError(error.to_string())),
            }
        }
    }

    fn is_transient_lock_error(error: &rusqlite::Error) -> bool {
        match error {
            rusqlite::Error::SqliteFailure(sqlite_error, maybe_message) => {
                matches!(
                    sqlite_error.code,
                    ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked
                ) || maybe_message.as_deref().is_some_and(|message| {
                    let lower = message.to_ascii_lowercase();
                    lower.contains("database is locked") || lower.contains("database is busy")
                })
            }
            _ => false,
        }
    }
}

#[async_trait]
impl DBContext for SqliteDbRepository {
    async fn find_image_id_by_filename_and_hash(
        &self,
        filename: &str,
        blake3_hash: &str,
    ) -> Result<Option<i64>, DiscoveryError> {
        self.execute_with_retry(|db| {
            let mut stmt =
                db.prepare("SELECT id FROM images WHERE filename = ? AND blake3_hash = ?")?;
            stmt.query_row((filename, blake3_hash), |row| row.get(0))
                .optional()
        })
    }

    async fn insert_image_with_exif(
        &self,
        file: &DiscoveredFile,
        blake3_hash: &str,
        exif: &BasicExif,
        real_exif: Option<&ExifMetadata>,
    ) -> Result<i64, DiscoveryError> {
        let file_path_str = file
            .path
            .to_str()
            .ok_or_else(|| DiscoveryError::IoError("Invalid UTF-8 in file path".to_string()))?;

        self.execute_with_retry(|db| {
            let transaction = db.transaction()?;

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

            transaction.execute(
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
            )?;

            let image_id = transaction.last_insert_rowid();

            let new_exif = if let Some(real) = real_exif {
                NewExifMetadata {
                    image_id,
                    iso: real.iso.map(|iso| iso as i32),
                    aperture: real.aperture.map(|aperture| aperture as f64),
                    shutter_speed: real.shutter_speed.map(|shutter_speed| shutter_speed as f64),
                    focal_length: real.focal_length.map(|focal_length| focal_length as f64),
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
                    aperture: exif.aperture.map(|aperture| aperture as f64),
                    shutter_speed: exif
                        .shutter_speed
                        .as_deref()
                        .and_then(|speed| speed.parse::<f64>().ok()),
                    focal_length: exif.focal_length.map(|focal_length| focal_length as f64),
                    lens: exif.lens.clone(),
                    camera_make: exif.make.clone(),
                    camera_model: exif.model.clone(),
                    gps_lat: None,
                    gps_lon: None,
                    color_space: None,
                }
            };

            transaction.execute(
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
            )?;

            transaction.execute(
                "INSERT INTO image_state (image_id, rating, flag) VALUES (?, 0, NULL)",
                rusqlite::params![image_id],
            )?;

            transaction.commit()?;

            Ok(image_id)
        })
    }

    async fn create_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
        self.execute_with_retry(|db| {
            ensure_ingestion_tracking_schema(db)?;
            db.execute(
                "INSERT OR REPLACE INTO ingestion_sessions (id, started_at, status) VALUES (?, ?, ?)",
                rusqlite::params![
                    session_id.to_string(),
                    chrono::Utc::now().to_rfc3339(),
                    "scanning"
                ],
            )?;
            Ok(())
        })
    }

    async fn update_ingestion_session(
        &self,
        session_id: Uuid,
        stats: SessionStatsUpdate,
    ) -> Result<(), DiscoveryError> {
        self.execute_with_retry(|db| {
            ensure_ingestion_tracking_schema(db)?;
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
            )?;
            Ok(())
        })
    }

    async fn complete_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError> {
        self.execute_with_retry(|db| {
            ensure_ingestion_tracking_schema(db)?;
            db.execute(
                "UPDATE ingestion_sessions SET
                    status = 'completed',
                    completed_at = ?
                WHERE id = ?",
                rusqlite::params![chrono::Utc::now().to_rfc3339(), session_id.to_string()],
            )?;
            Ok(())
        })
    }

    async fn get_ingestion_session_record(
        &self,
        session_id: Uuid,
    ) -> Result<Option<SessionStatsRecord>, DiscoveryError> {
        self.execute_with_retry(|db| {
            ensure_ingestion_tracking_schema(db)?;

            let mut stmt = db.prepare(
                "SELECT
                    total_files,
                    ingested_files,
                    failed_files,
                    skipped_files,
                    total_size_bytes,
                    avg_processing_time_ms
                FROM ingestion_sessions
                WHERE id = ?",
            )?;

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
        })
    }

    async fn get_recent_import_fallback(&self) -> Result<(i64, Option<i64>), DiscoveryError> {
        self.execute_with_retry(|db| {
            let mut stmt = db.prepare(
                "SELECT
                    COUNT(*) as total_files,
                    SUM(file_size_bytes) as total_size
                FROM images
                WHERE imported_at >= datetime('now', '-1 hour')",
            )?;

            stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?)))
        })
    }

    fn get_pool_metrics(&self) -> Option<DbPoolMetrics> {
        self.pool_metrics()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn create_ingestion_session_bootstraps_schema_when_missing() {
        let conn = rusqlite::Connection::open_in_memory().expect("in-memory DB should open");
        let repo = SqliteDbRepository::new(Arc::new(Mutex::new(conn)));
        let session_id = Uuid::new_v4();

        let created = repo.create_ingestion_session(session_id).await;
        assert!(created.is_ok(), "create_ingestion_session should succeed");

        let shared = repo
            .shared_connection()
            .expect("shared connection must be available");
        let guard = shared.lock().expect("DB lock should succeed");

        let table_exists: i64 = guard
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='ingestion_sessions'",
                [],
                |row| row.get(0),
            )
            .expect("table existence query should succeed");

        assert_eq!(table_exists, 1);
    }

    #[tokio::test]
    async fn pooled_repository_handles_concurrent_session_updates() {
        let temp_dir = TempDir::new().expect("temp dir should be created");
        let db_path = temp_dir.path().join("pooled-concurrent.db");
        let config = SqlitePoolConfig {
            max_connections: 8,
            min_connections: 2,
            acquire_timeout: Duration::from_millis(500),
            busy_timeout: Duration::from_millis(300),
            max_retry_attempts: 3,
            retry_backoff: Duration::from_millis(15),
        };

        let repo = Arc::new(
            SqliteDbRepository::from_db_path_with_config(&db_path, config)
                .expect("pooled repository should be created"),
        );

        let workers = 24usize;
        let mut handles = Vec::new();
        for index in 0..workers {
            let repo_clone = Arc::clone(&repo);
            handles.push(tokio::spawn(async move {
                let session_id = Uuid::new_v4();
                repo_clone.create_ingestion_session(session_id).await?;
                repo_clone
                    .update_ingestion_session(
                        session_id,
                        SessionStatsUpdate {
                            total_files: 10,
                            ingested_files: 8,
                            failed_files: 1,
                            skipped_files: 1,
                            total_size_bytes: 10_000 + index as u64,
                            avg_processing_time_ms: 12.5,
                        },
                    )
                    .await?;
                repo_clone.complete_ingestion_session(session_id).await?;
                Ok::<(), DiscoveryError>(())
            }));
        }

        for handle in handles {
            let result = handle.await.expect("join should succeed");
            assert!(result.is_ok(), "session worker should succeed");
        }

        let conn = rusqlite::Connection::open(&db_path).expect("connection should open");
        let completed_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM ingestion_sessions WHERE status = 'completed'",
                [],
                |row| row.get(0),
            )
            .expect("query should succeed");

        assert_eq!(completed_count, workers as i64);

        let metrics = repo
            .pool_metrics()
            .expect("pooled repository should expose metrics");
        assert!(metrics.acquire_count > 0);
        assert!(metrics.total_connections >= metrics.idle_connections);
    }

    #[tokio::test]
    async fn pooled_repository_reports_acquire_timeout_when_exhausted() {
        let temp_dir = TempDir::new().expect("temp dir should be created");
        let db_path = temp_dir.path().join("pooled-timeout.db");
        let config = SqlitePoolConfig {
            max_connections: 1,
            min_connections: 1,
            acquire_timeout: Duration::from_millis(40),
            busy_timeout: Duration::from_millis(500),
            max_retry_attempts: 0,
            retry_backoff: Duration::from_millis(1),
        };

        let repo = SqliteDbRepository::from_db_path_with_config(&db_path, config)
            .expect("pooled repository should be created");

        let held_connection = match &repo.backend {
            RepositoryBackend::Pooled(pool) => pool.get().expect("pool get should succeed"),
            RepositoryBackend::Shared(_) => panic!("expected pooled backend"),
        };

        let result = repo.create_ingestion_session(Uuid::new_v4()).await;

        drop(held_connection);

        assert!(
            result.is_err(),
            "operation should timeout when pool is exhausted"
        );

        let metrics = repo
            .pool_metrics()
            .expect("pooled repository should expose metrics");
        assert!(
            metrics.acquire_timeout_count >= 1,
            "acquire timeout metric should be incremented"
        );
    }

    #[tokio::test]
    async fn pooled_repository_retries_transient_busy_errors() {
        let temp_dir = TempDir::new().expect("temp dir should be created");
        let db_path = temp_dir.path().join("pooled-retry.db");
        let config = SqlitePoolConfig {
            max_connections: 4,
            min_connections: 1,
            acquire_timeout: Duration::from_millis(1_000),
            busy_timeout: Duration::from_millis(20),
            max_retry_attempts: 6,
            retry_backoff: Duration::from_millis(20),
        };

        let repo = SqliteDbRepository::from_db_path_with_config(&db_path, config)
            .expect("pooled repository should be created");
        let session_id = Uuid::new_v4();

        repo.create_ingestion_session(session_id)
            .await
            .expect("initial session should be created");

        let lock_db_path = db_path.clone();
        let lock_guard = thread::spawn(move || {
            let lock_conn =
                rusqlite::Connection::open(lock_db_path).expect("lock connection should open");
            lock_conn
                .busy_timeout(Duration::from_millis(1))
                .expect("busy timeout pragma should be set");
            lock_conn
                .execute_batch("BEGIN EXCLUSIVE;")
                .expect("exclusive lock should start");
            thread::sleep(Duration::from_millis(120));
            lock_conn
                .execute_batch("COMMIT;")
                .expect("exclusive lock should commit");
        });

        thread::sleep(Duration::from_millis(10));

        let update_result = repo
            .update_ingestion_session(
                session_id,
                SessionStatsUpdate {
                    total_files: 1,
                    ingested_files: 1,
                    failed_files: 0,
                    skipped_files: 0,
                    total_size_bytes: 42,
                    avg_processing_time_ms: 3.0,
                },
            )
            .await;

        lock_guard.join().expect("lock thread should finish");

        assert!(
            update_result.is_ok(),
            "retry logic should eventually succeed after lock release"
        );

        let metrics = repo
            .pool_metrics()
            .expect("pooled repository should expose metrics");
        assert!(
            metrics.retry_count > 0,
            "retry counter should be incremented when lock contention occurs"
        );
    }
}

use crate::models::discovery::{BasicExif, DiscoveredFile, DiscoveryError};
use crate::models::exif::ExifMetadata;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbPoolMetrics {
    pub total_connections: u32,
    pub idle_connections: u32,
    pub in_use_connections: u32,
    pub acquire_count: u64,
    pub acquire_timeout_count: u64,
    pub retry_count: u64,
    pub total_acquire_wait_ms: u64,
    pub avg_acquire_wait_ms: f64,
}

#[derive(Debug, Clone)]
pub struct SessionStatsUpdate {
    pub total_files: usize,
    pub ingested_files: usize,
    pub failed_files: usize,
    pub skipped_files: usize,
    pub total_size_bytes: u64,
    pub avg_processing_time_ms: f64,
}

#[derive(Debug, Clone)]
pub struct SessionStatsRecord {
    pub total_files: i64,
    pub ingested_files: i64,
    pub failed_files: i64,
    pub skipped_files: i64,
    pub total_size_bytes: Option<i64>,
    pub avg_processing_time_ms: Option<f64>,
}

#[async_trait]
pub trait DBContext: Send + Sync {
    async fn find_image_id_by_filename_and_hash(
        &self,
        filename: &str,
        blake3_hash: &str,
    ) -> Result<Option<i64>, DiscoveryError>;

    async fn insert_image_with_exif(
        &self,
        file: &DiscoveredFile,
        blake3_hash: &str,
        exif: &BasicExif,
        real_exif: Option<&ExifMetadata>,
    ) -> Result<i64, DiscoveryError>;

    async fn create_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError>;

    async fn update_ingestion_session(
        &self,
        session_id: Uuid,
        stats: SessionStatsUpdate,
    ) -> Result<(), DiscoveryError>;

    async fn complete_ingestion_session(&self, session_id: Uuid) -> Result<(), DiscoveryError>;

    async fn get_ingestion_session_record(
        &self,
        session_id: Uuid,
    ) -> Result<Option<SessionStatsRecord>, DiscoveryError>;

    async fn get_recent_import_fallback(&self) -> Result<(i64, Option<i64>), DiscoveryError>;

    fn get_pool_metrics(&self) -> Option<DbPoolMetrics> {
        None
    }
}

//! Analytics Commands — Phase 6.2
//!
//! Tauri command handlers for DuckDB-powered analytics,
//! aggregations, and catalog statistics.

use crate::models::dto::CommandResult;
use crate::services::duckdb_service::{CatalogStats, DuckDBService, GroupByResult};
use std::sync::{Arc, Mutex};
use tauri::State;

/// Application state with DuckDB service
pub struct AnalyticsState {
    pub duckdb: Arc<Mutex<DuckDBService>>,
}

/// Get aggregations grouped by the specified attribute
///
/// Supported group_by values: "month", "camera", "iso", "rating"
/// Returns grouped statistics with counts and percentages
///
/// Example: `get_aggregations("month")` → [
///   { key: "2024-01", count: 345, percentage: 12.5 },
///   { key: "2024-02", count: 298, percentage: 10.8 },
///   ...
/// ]
#[tauri::command]
#[allow(dead_code)] // Called by frontend via Tauri IPC
pub async fn get_aggregations(
    state: State<'_, AnalyticsState>,
    group_by: String,
) -> CommandResult<Vec<GroupByResult>> {
    if cfg!(debug_assertions) {
        eprintln!("[Analytics] get_aggregations(group_by={})", group_by);
    }

    let duckdb = state
        .duckdb
        .lock()
        .map_err(|e| format!("DuckDB lock error: {}", e))?;

    let results = duckdb
        .execute_aggregation(&group_by)
        .map_err(|e| format!("Aggregation error: {}", e))?;

    Ok(results)
}

/// Get catalog-wide statistics
///
/// Returns comprehensive statistics including:
/// - Total image count
/// - Total size in GB
/// - Date range
/// - Average image size
/// - Distributions by rating, camera, ISO
///
/// Example response:
/// ```json
/// {
///   "totalImages": 12547,
///   "totalSizeGb": 342.5,
///   "oldestImageDate": "2020-01-15",
///   "newestImageDate": "2024-03-07",
///   "averageImageSize": 27648,
///   "ratedImagesCount": 3421,
///   "flaggedImagesCount": 567,
///   "distributionByRating": [
///     { "rating": 0, "count": 9126 },
///     { "rating": 5, "count": 2341 }
///   ],
///   ...
/// }
/// ```
#[tauri::command]
#[allow(dead_code)] // Called by frontend via Tauri IPC
pub async fn get_catalog_statistics(
    state: State<'_, AnalyticsState>,
) -> CommandResult<CatalogStats> {
    if cfg!(debug_assertions) {
        eprintln!("[Analytics] get_catalog_statistics");
    }

    let duckdb = state
        .duckdb
        .lock()
        .map_err(|e| format!("DuckDB lock error: {}", e))?;

    let stats = duckdb
        .get_catalog_stats()
        .map_err(|e| format!("Stats error: {}", e))?;

    Ok(stats)
}

/// Execute a smart collection query on DuckDB
///
/// Parses the query JSON and returns matching image IDs.
/// This command is used internally by smart collections to fetch
/// results efficiently.
///
/// Query format (example):
/// ```json
/// {
///   "rules": [
///     { "field": "rating", "operator": ">=", "value": 4 },
///     { "field": "camera_model", "operator": "contains", "value": "Canon" }
///   ],
///   "combineWith": "AND"
/// }
/// ```
#[tauri::command]
#[allow(dead_code)] // Called by frontend via Tauri IPC
pub async fn execute_smart_query(
    state: State<'_, AnalyticsState>,
    query_json: String,
) -> CommandResult<Vec<u32>> {
    if cfg!(debug_assertions) {
        eprintln!("[Analytics] execute_smart_query: {}", query_json);
    }

    let _duckdb = state
        .duckdb
        .lock()
        .map_err(|e| format!("DuckDB lock error: {}", e))?;

    // Parse query_json and execute on DuckDB
    // For now, return empty while smart query parsing is implemented
    // TODO: Implement full query parsing and execution

    Ok(vec![])
}

/// Synchronize SQLite to DuckDB
///
/// Internal command that triggers a full or incremental sync from SQLite
/// to DuckDB. Should be called periodically (every 5 minutes) or after
/// significant data changes.
///
/// Returns the sync metadata (records synced, duration).
#[tauri::command]
#[allow(dead_code)] // Called by frontend via Tauri IPC, or by internal sync timer
pub async fn sync_duckdb_from_sqlite(
    analytics_state: State<'_, AnalyticsState>,
    db_state: State<'_, crate::commands::catalog::AppState>,
) -> CommandResult<SyncMetadataDTO> {
    if cfg!(debug_assertions) {
        eprintln!("[Analytics] sync_duckdb_from_sqlite");
    }

    let mut db_guard = db_state
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {}", e))?;

    let sqlite_conn = db_guard.transaction_conn();

    let duckdb = analytics_state
        .duckdb
        .lock()
        .map_err(|e| format!("DuckDB lock error: {}", e))?;

    let metadata = duckdb
        .sync_from_sqlite(sqlite_conn, None)
        .map_err(|e| format!("Sync error: {}", e))?;

    Ok(SyncMetadataDTO {
        last_sync_ts: metadata.last_sync_ts,
        total_records: metadata.total_records,
        sync_duration_ms: metadata.sync_duration_ms,
    })
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMetadataDTO {
    pub last_sync_ts: i64,
    pub total_records: i64,
    pub sync_duration_ms: u128,
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_metadata_dto_serialization() {
        let dto = SyncMetadataDTO {
            last_sync_ts: 1234567890,
            total_records: 5000,
            sync_duration_ms: 234,
        };

        let json = serde_json::to_string(&dto).expect("Serialization failed");

        assert!(json.contains("\"last_sync_ts\""));
        assert!(json.contains("1234567890"));
        assert!(json.contains("\"total_records\""));
        assert!(json.contains("5000"));
        assert!(json.contains("\"sync_duration_ms\""));
    }

    #[test]
    fn test_sync_metadata_dto_deserialization() {
        let json = r#"{
            "last_sync_ts": 1234567890,
            "total_records": 5000,
            "sync_duration_ms": 234
        }"#;

        let dto: SyncMetadataDTO = serde_json::from_str(json).expect("Deserialization failed");

        assert_eq!(dto.last_sync_ts, 1234567890);
        assert_eq!(dto.total_records, 5000);
        assert_eq!(dto.sync_duration_ms, 234);
    }

    #[test]
    fn test_invalid_json_deserialization() {
        let invalid_json = r#"{ incomplete json"#;
        let result: Result<SyncMetadataDTO, _> = serde_json::from_str(invalid_json);

        assert!(result.is_err(), "Invalid JSON should fail deserialization");
    }

    #[test]
    fn test_type_mismatch_deserialization() {
        let json_with_wrong_type = r#"{
            "last_sync_ts": "not a number",
            "total_records": 5000,
            "sync_duration_ms": 234
        }"#;

        let result: Result<SyncMetadataDTO, _> = serde_json::from_str(json_with_wrong_type);
        assert!(result.is_err(), "Type mismatch should fail");
    }
}

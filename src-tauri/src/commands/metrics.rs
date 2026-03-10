use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// Threadpool saturation metrics snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadpoolMetricsDTO {
    pub active_tasks: usize,
    pub queue_depth: usize,
    pub max_threads: usize,
    pub saturation_percentage: f32,
}

/// Get current threadpool metrics
#[tauri::command]
pub async fn get_threadpool_metrics() -> Result<ThreadpoolMetricsDTO, String> {
    // TODO [M.1.1a]: Connect to real IngestionService::METRICS_COLLECTOR
    // Currently returns hard-coded values. Must:
    // 1. Access static DEFAULT_METRICS_COLLECTOR from ingestion.rs
    // 2. Call get_latest_metrics() to fetch real active_tasks, queue_depth, saturation_percentage
    // 3. Return actual metrics instead of mock data
    Ok(ThreadpoolMetricsDTO {
        active_tasks: 0,
        queue_depth: 0,
        max_threads: 8,
        saturation_percentage: 0.0,
    })
}

/// Simulate threadpool load for testing
///
/// TODO [M.1.1a]: Remove once real metrics integration is complete
/// This endpoint is for frontend visual testing only. Once get_threadpool_metrics()
/// returns real data, this simulation function becomes unnecessary.
#[tauri::command]
pub async fn simulate_threadpool_load(
    task_count: usize,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Spawn fake tasks to demonstrate metrics
    for i in 0..task_count {
        let handle = app_handle.clone();
        tokio::spawn(async move {
            // Simulate some work
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

            // Emit a metrics update event
            let _ = handle.emit(
                "threadpool-saturation-alert",
                ThreadpoolMetricsDTO {
                    active_tasks: task_count.saturating_sub(i),
                    queue_depth: 0,
                    max_threads: 8,
                    saturation_percentage: ((task_count.saturating_sub(i)) as f32 / 8.0) * 100.0,
                },
            );
        });
    }

    Ok(())
}

/**
 * Cache Commands — Tauri RPC Interface (Phase 6.1)
 *
 * Exposes cache operations to the frontend via #[tauri::command].
 * All operations are async and thread-safe via Tauri's managed state.
 */
use crate::cache::CacheInstance;
use crate::commands::catalog::AppState;
use base64::Engine;
use serde_json::json;
use tauri::State;

/// Get cached thumbnail by image ID
///
/// Returns Base64-encoded image data if found in L1 or L2 cache.
/// Returns null if not in any cache (should generate from RAW).
#[tauri::command]
pub async fn get_cached_thumbnail(
    image_id: u32,
    cache: State<'_, CacheInstance>,
) -> Result<Option<String>, String> {
    match cache.get_thumbnail(image_id).await? {
        Some(data) => {
            let encoded = encode_base64(&data);
            Ok(Some(encoded))
        }
        None => Ok(None),
    }
}

/// Store thumbnail in cache (both L1 and L2)
///
/// Expected: Base64-encoded image data
#[tauri::command]
pub async fn set_cached_thumbnail(
    image_id: u32,
    data_base64: String,
    cache: State<'_, CacheInstance>,
) -> Result<(), String> {
    let data = decode_base64(&data_base64).map_err(|e| format!("Invalid base64 data: {}", e))?;

    cache.put_thumbnail(image_id, data).await?;
    Ok(())
}

/// Invalidate cache entry for an image
///
/// Removes from both L1 and L2 caches.
/// Called when an image is edited via Event Sourcing.
#[tauri::command]
pub async fn invalidate_image_cache(
    image_id: u32,
    cache: State<'_, CacheInstance>,
) -> Result<(), String> {
    cache.invalidate_image(image_id).await?;
    Ok(())
}

/// Get cache statistics for monitoring
///
/// Returns hit rates, current sizes, and capacity info.
#[tauri::command]
pub async fn get_cache_stats(cache: State<'_, CacheInstance>) -> Result<serde_json::Value, String> {
    let stats = cache.get_stats().await?;

    Ok(json!({
        "l1": {
            "size": stats.l1_size,
            "capacity": stats.l1_capacity,
            "utilization": format!("{:.1}%", (stats.l1_size as f64 / stats.l1_capacity as f64) * 100.0),
            "hits": stats.l1_hits,
            "misses": stats.l1_misses,
            "hitRate": if stats.l1_hits + stats.l1_misses > 0 {
                format!("{:.1}%", (stats.l1_hits as f64 / (stats.l1_hits + stats.l1_misses) as f64) * 100.0)
            } else {
                "N/A".to_string()
            }
        },
        "l2": {
            "size": stats.l2_size,
            "diskUsage": format_bytes(stats.l2_disk_usage),
            "diskUsageBytes": stats.l2_disk_usage,
            "hits": stats.l2_hits,
            "misses": stats.l2_misses,
            "hitRate": if stats.l2_hits + stats.l2_misses > 0 {
                format!("{:.1}%", (stats.l2_hits as f64 / (stats.l2_hits + stats.l2_misses) as f64) * 100.0)
            } else {
                "N/A".to_string()
            }
        },
        "details": {
            "size": stats.details_size,
            "capacity": stats.details_capacity,
            "utilization": format!("{:.1}%", (stats.details_size as f64 / stats.details_capacity as f64) * 100.0),
            "hits": stats.details_hits,
            "misses": stats.details_misses,
            "hitRate": if stats.details_hits + stats.details_misses > 0 {
                format!("{:.1}%", (stats.details_hits as f64 / (stats.details_hits + stats.details_misses) as f64) * 100.0)
            } else {
                "N/A".to_string()
            }
        }
    }))
}

/// Clear all caches (useful for testing or manual cleanup)
#[tauri::command]
pub async fn clear_all_caches(cache: State<'_, CacheInstance>) -> Result<(), String> {
    cache.clear_all().await?;
    Ok(())
}

/// Check if an image is cached at specific level
///
/// level: "L1", "L2", or "any"
#[tauri::command]
pub async fn is_image_cached(
    image_id: u32,
    level: String,
    cache: State<'_, CacheInstance>,
) -> Result<bool, String> {
    match level.to_uppercase().as_str() {
        "L1" => Ok(cache.l1.get(image_id).await.is_some()),
        "L2" => cache.l2.exists(image_id).await.map_err(|e| e.to_string()),
        "ANY" => {
            let in_l1 = cache.l1.get(image_id).await.is_some();
            if in_l1 {
                return Ok(true);
            }
            cache.l2.exists(image_id).await.map_err(|e| e.to_string())
        }
        _ => Err(format!("Invalid cache level: {}", level)),
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Encode bytes as base64 for JSON transmission
fn encode_base64(data: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(data)
}

/// Decode base64 string back to bytes
fn decode_base64(s: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .map_err(|e| e.to_string())
}

/// Format bytes as human-readable string
fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_idx = 0;

    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }

    format!("{:.2} {}", size, UNITS[unit_idx])
}

// ============================================================================
// Phase 6.1 Completion — Metadata Commands
// ============================================================================

/// Get cache metadata for a specific image.
///
/// Returns the persisted metadata record (cached_at, last_accessed, size_bytes,
/// source, is_valid) or `null` when the image has never been cached.
#[tauri::command]
pub async fn get_cache_metadata(
    image_id: u32,
    state: State<'_, AppState>,
) -> Result<Option<serde_json::Value>, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    let row =
        crate::services::cache_metadata::CacheMetadataService::get(db.connection(), image_id)?;

    Ok(row.map(|r| {
        let dto: crate::services::cache_metadata::CacheMetadataDTO = r.into();
        serde_json::to_value(dto).unwrap_or(serde_json::Value::Null)
    }))
}

/// Manually update (upsert) the cache metadata record for an image.
///
/// Typically called after setting a thumbnail via `set_cached_thumbnail` so
/// the metadata table stays in sync with the actual cache state.
#[tauri::command]
pub async fn update_cache_metadata(
    image_id: u32,
    source: String,
    size_bytes: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Validate source value
    match source.as_str() {
        "L1" | "L2" | "COMPUTED" => {}
        other => return Err(format!("Invalid cache source: {}", other)),
    }

    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Database lock poisoned: {}", e))?;

    crate::services::cache_metadata::CacheMetadataService::upsert(
        db.connection(),
        image_id,
        size_bytes,
        &source,
    )
}

/// Warm the L1 cache by loading the most recently accessed thumbnails from L2.
///
/// Queries the `cache_metadata` table for the top-`batch_size` recently
/// accessed (and still valid) images, then for each one that has a file in L2,
/// loads it into L1.  This brings the L1 hit rate up quickly on app restart.
///
/// Returns counts of successfully promoted items and total elapsed time.
#[tauri::command]
pub async fn warm_cache_from_db(
    batch_size: u32,
    state: State<'_, AppState>,
    cache: State<'_, CacheInstance>,
) -> Result<serde_json::Value, String> {
    let start = std::time::Instant::now();
    let limit = (batch_size.clamp(1, 200)) as usize; // Clamp 1..=200

    // 1. Fetch recently accessed image IDs from DB
    let candidate_ids = {
        let mut db = state
            .db
            .lock()
            .map_err(|e| format!("Database lock poisoned: {}", e))?;

        crate::services::cache_metadata::CacheMetadataService::get_recently_accessed(
            db.connection(),
            limit,
        )?
    };

    let total_candidates = candidate_ids.len() as u32;
    let mut warmed_count = 0u32;
    let mut skipped_count = 0u32;

    // 2. For each candidate, try to promote from L2 → L1
    for image_id in candidate_ids {
        // Skip if already in L1
        if cache.l1.get(image_id).await.is_some() {
            skipped_count += 1;
            continue;
        }

        // Attempt to load from L2 and promote to L1
        match cache.l2.get(image_id).await {
            Ok(Some(data)) => {
                if cache.l1.put(image_id, data).await.is_ok() {
                    warmed_count += 1;
                } else {
                    skipped_count += 1;
                }
            }
            _ => {
                skipped_count += 1;
            }
        }
    }

    let elapsed_ms = start.elapsed().as_millis();
    log::info!(
        "[Cache] warm_cache_from_db: warmed={} skipped={} total={} elapsed={}ms",
        warmed_count,
        skipped_count,
        total_candidates,
        elapsed_ms,
    );

    Ok(serde_json::json!({
        "warmedCount": warmed_count,
        "skippedCount": skipped_count,
        "totalCandidates": total_candidates,
        "elapsedMs": elapsed_ms,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_bytes() {
        assert!(format_bytes(512).contains("B"));
        assert!(format_bytes(1024).contains("KB"));
        assert!(format_bytes(1024 * 1024).contains("MB"));
        assert!(format_bytes(1024 * 1024 * 1024).contains("GB"));
    }

    #[test]
    fn test_base64_roundtrip() {
        let data = vec![1, 2, 3, 4, 5];
        let encoded = encode_base64(&data);
        let decoded = decode_base64(&encoded).expect("Failed to decode");
        assert_eq!(data, decoded);
    }
}

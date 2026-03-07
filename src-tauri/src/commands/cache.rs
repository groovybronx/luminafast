/**
 * Cache Commands — Tauri RPC Interface (Phase 6.1)
 *
 * Exposes cache operations to the frontend via #[tauri::command].
 * All operations are async and thread-safe via Tauri's managed state.
 */
use crate::cache::CacheInstance;
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
            "hitRate": format!("{:.1}%", (stats.l1_hits as f64 / (stats.l1_hits + stats.l1_misses) as f64) * 100.0)
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

/**
 * Cache Integration Service — Phase 6.1.3
 *
 * Bridges cache layer with catalog operations.
 * Coordinates cache invalidation on edits, and fetching with cache fallback.
 */
use crate::cache::CacheInstance;
use std::sync::Arc;

/// Cache-aware catalog operations coordinator
pub struct CacheIntegrationService {
    cache: Arc<CacheInstance>,
}

impl CacheIntegrationService {
    /// Create a new integration service
    pub fn new(cache: Arc<CacheInstance>) -> Self {
        Self { cache }
    }

    /// Invalidate image cache after edit
    /// Called when image_id is modified via Event Sourcing
    pub async fn invalidate_on_edit(&self, image_id: u32) -> Result<(), String> {
        self.cache.invalidate_image(image_id).await?;
        log::info!(
            "[CacheIntegration] Invalidated cache for image_id={}",
            image_id
        );
        Ok(())
    }

    /// Warm cache with a batch of image IDs at startup
    pub async fn warm_cache_batch(&self, image_ids: Vec<u32>) -> Result<usize, String> {
        let mut warmed = 0;
        for _id in image_ids {
            // In Phase 3, this would fetch from DB and populate L1+L2
            // For now, it's a placeholder
            warmed += 1;
        }
        log::info!("[CacheIntegration] Warmed cache with {} images", warmed);
        Ok(warmed)
    }

    /// Get cache statistics for monitoring
    pub async fn get_cache_stats(&self) -> Result<serde_json::Value, String> {
        let stats = self.cache.get_stats().await?;
        Ok(serde_json::json!({
            "l1": {
                "size": stats.l1_size,
                "capacity": stats.l1_capacity,
                "hits": stats.l1_hits,
                "misses": stats.l1_misses,
                "hit_rate": if stats.l1_hits + stats.l1_misses > 0 {
                    stats.l1_hits as f64 / (stats.l1_hits + stats.l1_misses) as f64
                } else {
                    0.0
                }
            },
            "l2": {
                "size": stats.l2_size,
                "disk_usage_bytes": stats.l2_disk_usage,
                "hits": stats.l2_hits,
                "misses": stats.l2_misses,
                "hit_rate": if stats.l2_hits + stats.l2_misses > 0 {
                    stats.l2_hits as f64 / (stats.l2_hits + stats.l2_misses) as f64
                } else {
                    0.0
                }
            }
        }))
    }
}

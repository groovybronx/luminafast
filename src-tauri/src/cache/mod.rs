/**
 * Cache Module — L1/L2 Multilevel Cache System (Phase 6.1)
 *
 * Re-exports cache structures and provides module-level initialization.
 * This module coordinates L1 (memory) and L2 (disk) caches.
 *
 * Usage:
 *   let instance = CacheInstance::new(max_l1_size);
 *   instance.get_thumbnail(image_id).await?;
 *   instance.invalidate_image(image_id).await?;
 */
pub mod l1;
pub mod l2;
pub mod metadata;

pub use l1::CacheL1;
pub use l2::CacheL2;
pub use metadata::CacheStats;

use std::path::PathBuf;
use std::sync::Arc;

/// Main cache instance coordinating L1 + L2
pub struct CacheInstance {
    pub l1: Arc<CacheL1>,
    pub l2: Arc<CacheL2>,
}

impl CacheInstance {
    /// Initialize cache with specified L1 capacity and L2 root directory
    pub fn new(l1_capacity: usize, l2_root: PathBuf) -> Result<Self, String> {
        let l1 = Arc::new(CacheL1::new(l1_capacity));
        let l2 = Arc::new(
            CacheL2::new(l2_root).map_err(|e| format!("Failed to initialize L2 cache: {}", e))?,
        );

        Ok(Self { l1, l2 })
    }

    /// Get thumbnail from L1, or L2 if L1 miss
    pub async fn get_thumbnail(&self, image_id: u32) -> Result<Option<Vec<u8>>, String> {
        // Check L1 first (fast path)
        if let Some(cached) = self.l1.get(image_id).await {
            return Ok(Some(cached));
        }

        // L1 miss — check L2
        if let Ok(Some(data)) = self.l2.get(image_id).await {
            // Populate L1 from L2 (cache population)
            let _ = self.l1.put(image_id, data.clone()).await;
            return Ok(Some(data));
        }

        // L1 and L2 miss
        Ok(None)
    }

    /// Store thumbnail in both L1 and L2
    pub async fn put_thumbnail(&self, image_id: u32, data: Vec<u8>) -> Result<(), String> {
        self.l1
            .put(image_id, data.clone())
            .await
            .map_err(|e| format!("L1 error: {}", e))?;

        self.l2
            .put(image_id, data)
            .await
            .map_err(|e| format!("L2 error: {}", e))?;

        Ok(())
    }

    /// Invalidate image from both L1 and L2
    pub async fn invalidate_image(&self, image_id: u32) -> Result<(), String> {
        self.l1
            .invalidate(image_id)
            .await
            .map_err(|e| format!("L1 error: {}", e))?;

        self.l2
            .invalidate(image_id)
            .await
            .map_err(|e| format!("L2 error: {}", e))?;

        Ok(())
    }

    /// Clear all caches (session-only design)
    pub async fn clear_all(&self) -> Result<(), String> {
        self.l1
            .clear()
            .await
            .map_err(|e| format!("L1 error: {}", e))?;

        self.l2
            .clear()
            .await
            .map_err(|e| format!("L2 error: {}", e))?;

        Ok(())
    }

    /// Get cache statistics for monitoring
    pub async fn get_stats(&self) -> Result<CacheStats, String> {
        let l1_stats = self
            .l1
            .get_stats()
            .await
            .map_err(|e| format!("L1 stats error: {}", e))?;

        let l2_stats = self
            .l2
            .get_stats()
            .await
            .map_err(|e| format!("L2 stats error: {}", e))?;

        Ok(CacheStats {
            l1_size: l1_stats.size,
            l1_capacity: l1_stats.capacity,
            l1_hits: l1_stats.hits,
            l1_misses: l1_stats.misses,
            l2_size: l2_stats.size,
            l2_disk_usage: l2_stats.disk_usage,
            l2_hits: l2_stats.hits,
            l2_misses: l2_stats.misses,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_cache_instance_creation() {
        let temp_dir = TempDir::new().unwrap();
        let instance = CacheInstance::new(10, temp_dir.path().to_path_buf());
        assert!(instance.is_ok());
    }

    #[tokio::test]
    async fn test_l1_l2_fallback() {
        let temp_dir = TempDir::new().unwrap();
        let instance =
            CacheInstance::new(10, temp_dir.path().to_path_buf()).expect("Failed to create cache");

        let test_id = 1u32;
        let test_data = vec![1, 2, 3, 4, 5];

        // Store in cache
        instance
            .put_thumbnail(test_id, test_data.clone())
            .await
            .expect("Failed to put thumbnail");

        // Clear L1 to test L2 fallback
        instance
            .l1
            .invalidate(test_id)
            .await
            .expect("Failed to clear L1");

        // Retrieve should still work via L2 fallback
        let retrieved = instance
            .get_thumbnail(test_id)
            .await
            .expect("Failed to get thumbnail")
            .expect("Thumbnail not found");

        assert_eq!(retrieved, test_data);
    }

    #[tokio::test]
    async fn test_invalidation_both_levels() {
        let temp_dir = TempDir::new().unwrap();
        let instance =
            CacheInstance::new(10, temp_dir.path().to_path_buf()).expect("Failed to create cache");

        let test_id = 1u32;
        let test_data = vec![1, 2, 3, 4, 5];

        instance
            .put_thumbnail(test_id, test_data)
            .await
            .expect("Failed to put thumbnail");

        // Invalidate should remove from both levels
        instance
            .invalidate_image(test_id)
            .await
            .expect("Failed to invalidate");

        let retrieved = instance
            .get_thumbnail(test_id)
            .await
            .expect("Failed to get thumbnail");

        assert!(retrieved.is_none());
    }
}

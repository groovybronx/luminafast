/**
 * L1 Cache — In-Memory LRU Cache (Phase 6.1)
 *
 * Thread-safe in-memory LRU cache for thumbnails.
 * - Max capacity: configurable (default 500 images)
 * - Eviction policy: LRU (Least Recently Used)
 * - Persistence: Session-only (cleared on app exit)
 * - Async: tokio-compatible with Arc<Mutex<>>
 */
use lru::LruCache;
use std::num::NonZeroUsize;
use std::sync::Arc;
use tokio::sync::Mutex;

pub const L1_DEFAULT_CAPACITY: usize = 500; // Used in lib.rs for CacheInstance initialization

/// Statistics for L1 cache monitoring
#[derive(Debug, Clone)]
pub struct L1Stats {
    pub size: usize,
    pub capacity: usize,
    pub hits: u64,
    pub misses: u64,
}

/// In-memory LRU cache for thumbnails
#[derive(Clone)]
pub struct CacheL1 {
    cache: Arc<Mutex<LruCache<u32, Vec<u8>>>>,
    stats: Arc<Mutex<CacheL1Stats>>,
}

#[derive(Debug, Default)]
struct CacheL1Stats {
    hits: u64,
    misses: u64,
}

impl CacheL1 {
    /// Create a new L1 cache with specified capacity (in number of images)
    pub fn new(capacity: usize) -> Self {
        let cache_capacity =
            NonZeroUsize::new(capacity.max(1)).expect("L1 cache capacity must be at least 1");
        let cache = Arc::new(Mutex::new(LruCache::new(cache_capacity)));
        let stats = Arc::new(Mutex::new(CacheL1Stats::default()));

        Self { cache, stats }
    }

    /// Try to get a thumbnail from cache
    /// Returns Some(data) on hit, None on miss
    pub async fn get(&self, image_id: u32) -> Option<Vec<u8>> {
        let mut cache = self.cache.lock().await;

        if let Some(data) = cache.get(&image_id) {
            // Record hit
            let mut stats = self.stats.lock().await;
            stats.hits += 1;
            drop(stats);

            return Some(data.clone());
        }

        // Record miss
        let mut stats = self.stats.lock().await;
        stats.misses += 1;

        None
    }

    /// Put a thumbnail in cache
    /// If cache is full, evicts LRU (oldest unused) entry
    pub async fn put(&self, image_id: u32, data: Vec<u8>) -> Result<(), String> {
        let mut cache = self.cache.lock().await;
        cache.put(image_id, data);
        Ok(())
    }

    /// Invalidate a specific image from cache
    pub async fn invalidate(&self, image_id: u32) -> Result<(), String> {
        let mut cache = self.cache.lock().await;
        cache.pop(&image_id);
        Ok(())
    }

    /// Clear all entries from cache
    pub async fn clear(&self) -> Result<(), String> {
        let mut cache = self.cache.lock().await;
        cache.clear();
        Ok(())
    }

    /// Get current cache statistics
    pub async fn get_stats(&self) -> Result<L1Stats, String> {
        let cache = self.cache.lock().await;
        let stats = self.stats.lock().await;

        Ok(L1Stats {
            size: cache.len(),
            capacity: cache.cap().get(),
            hits: stats.hits,
            misses: stats.misses,
        })
    }

    /// Get current number of cached items
    pub async fn len(&self) -> usize {
        self.cache.lock().await.len()
    }

    /// Check if cache is full
    pub async fn is_full(&self) -> bool {
        let cache = self.cache.lock().await;
        cache.len() >= cache.cap().get()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_l1_cache_creation() {
        let cache = CacheL1::new(10);
        assert_eq!(cache.len().await, 0);
    }

    #[tokio::test]
    async fn test_l1_cache_put_get() {
        let cache = CacheL1::new(10);
        let test_data = vec![1, 2, 3, 4, 5];

        cache
            .put(1, test_data.clone())
            .await
            .expect("Failed to put");

        let retrieved = cache.get(1).await.expect("Failed to get");
        assert_eq!(retrieved, test_data);
    }

    #[tokio::test]
    async fn test_l1_cache_miss() {
        let cache = CacheL1::new(10);
        let result = cache.get(999).await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_l1_cache_eviction() {
        let cache = CacheL1::new(3); // Small capacity for testing
        let data1 = vec![1];
        let data2 = vec![2];
        let data3 = vec![3];
        let data4 = vec![4];

        // Fill cache to capacity
        cache.put(1, data1).await.unwrap();
        cache.put(2, data2).await.unwrap();
        cache.put(3, data3).await.unwrap();
        assert_eq!(cache.len().await, 3);

        // Add one more — should evict oldest (1)
        cache.put(4, data4).await.unwrap();
        assert_eq!(cache.len().await, 3);

        // Item 1 should be gone (LRU eviction)
        assert!(cache.get(1).await.is_none());
        assert!(cache.get(2).await.is_some());
        assert!(cache.get(3).await.is_some());
        assert!(cache.get(4).await.is_some());
    }

    #[tokio::test]
    async fn test_l1_cache_invalidate() {
        let cache = CacheL1::new(10);
        cache.put(1, vec![1, 2, 3]).await.unwrap();
        assert!(cache.get(1).await.is_some());

        cache.invalidate(1).await.unwrap();
        assert!(cache.get(1).await.is_none());
    }

    #[tokio::test]
    async fn test_l1_cache_clear() {
        let cache = CacheL1::new(10);
        cache.put(1, vec![1]).await.unwrap();
        cache.put(2, vec![2]).await.unwrap();
        cache.put(3, vec![3]).await.unwrap();

        cache.clear().await.unwrap();
        assert_eq!(cache.len().await, 0);
    }

    #[tokio::test]
    async fn test_l1_cache_stats() {
        let cache = CacheL1::new(10);
        let data = vec![1, 2, 3];

        // Generate some hits and misses
        cache.put(1, data.clone()).await.unwrap();
        let _ = cache.get(1).await; // Hit
        let _ = cache.get(1).await; // Hit
        let _ = cache.get(999).await; // Miss
        let _ = cache.get(999).await; // Miss

        let stats = cache.get_stats().await.unwrap();
        assert_eq!(stats.size, 1);
        assert_eq!(stats.capacity, 10);
        assert_eq!(stats.hits, 2);
        assert_eq!(stats.misses, 2);
    }
}

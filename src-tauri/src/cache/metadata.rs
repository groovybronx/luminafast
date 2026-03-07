/**
 * Cache Metadata — Unified Statistics & Monitoring (Phase 6.1)
 *
 * Structures for tracking cache performance and statistics.
 * Used for monitoring, diagnostics, and cache invalidation decisions.
 */
use serde::{Deserialize, Serialize};

/// Metadata about a cached item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetadata {
    pub image_id: u32,
    pub cached_at: String, // ISO 8601 timestamp
    pub last_accessed: String,
    pub size_bytes: u64,
    pub source: CacheSource, // Where was it cached from
}

/// Origin of cached data
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum CacheSource {
    Memory,   // L1 — in-memory
    Disk,     // L2 — on disk
    Computed, // Generated from event sourcing
}

/// Overall cache health and statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub l1_size: usize,     // Number of items in L1
    pub l1_capacity: usize, // Max capacity of L1
    pub l1_hits: u64,
    pub l1_misses: u64,
    pub l2_size: usize,     // Number of items in L2
    pub l2_disk_usage: u64, // Bytes used on disk
    pub l2_hits: u64,
    pub l2_misses: u64,
}

impl CacheStats {
    /// Calculate L1 hit rate (0.0 = no hits, 1.0 = all hits)
    pub fn l1_hit_rate(&self) -> f64 {
        let total = (self.l1_hits + self.l1_misses) as f64;
        if total == 0.0 {
            0.0
        } else {
            self.l1_hits as f64 / total
        }
    }

    /// Calculate L2 hit rate
    pub fn l2_hit_rate(&self) -> f64 {
        let total = (self.l2_hits + self.l2_misses) as f64;
        if total == 0.0 {
            0.0
        } else {
            self.l2_hits as f64 / total
        }
    }

    /// Check if L1 is near capacity
    pub fn l1_near_capacity(&self, threshold: f64) -> bool {
        let utilization = self.l1_size as f64 / self.l1_capacity as f64;
        utilization >= threshold
    }

    /// Recommend eviction if L2 disk usage exceeds threshold
    pub fn should_cleanup_l2(&self, max_bytes: u64) -> bool {
        self.l2_disk_usage > max_bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_stats_hit_rate_calculation() {
        let stats = CacheStats {
            l1_size: 100,
            l1_capacity: 500,
            l1_hits: 80,
            l1_misses: 20,
            l2_size: 200,
            l2_disk_usage: 1000,
            l2_hits: 150,
            l2_misses: 50,
        };

        assert_eq!(stats.l1_hit_rate(), 0.8);
        assert_eq!(stats.l2_hit_rate(), 0.75);
    }

    #[test]
    fn test_cache_stats_empty_hit_rate() {
        let stats = CacheStats {
            l1_size: 0,
            l1_capacity: 500,
            l1_hits: 0,
            l1_misses: 0,
            l2_size: 0,
            l2_disk_usage: 0,
            l2_hits: 0,
            l2_misses: 0,
        };

        assert_eq!(stats.l1_hit_rate(), 0.0);
        assert_eq!(stats.l2_hit_rate(), 0.0);
    }

    #[test]
    fn test_cache_stats_capacity_check() {
        let stats = CacheStats {
            l1_size: 450,
            l1_capacity: 500,
            l1_hits: 0,
            l1_misses: 0,
            l2_size: 0,
            l2_disk_usage: 0,
            l2_hits: 0,
            l2_misses: 0,
        };

        assert!(stats.l1_near_capacity(0.8)); // 90% > 80%
        assert!(!stats.l1_near_capacity(0.95)); // 90% < 95%
    }

    #[test]
    fn test_cache_stats_cleanup_recommendation() {
        let stats = CacheStats {
            l1_size: 0,
            l1_capacity: 500,
            l1_hits: 0,
            l1_misses: 0,
            l2_size: 100,
            l2_disk_usage: 5_000_000_000, // 5 GB
            l2_hits: 0,
            l2_misses: 0,
        };

        assert!(stats.should_cleanup_l2(4_000_000_000)); // 5 GB > 4 GB limit
        assert!(!stats.should_cleanup_l2(6_000_000_000)); // 5 GB < 6 GB limit
    }
}

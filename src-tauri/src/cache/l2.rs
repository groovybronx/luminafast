/**
 * L2 Cache — Disk-Based Cache Manager (Phase 6.1)
 *
 * Manages previews stored on disk in Previews.lrdata/ directory.
 * Uses metadata database to track stored previews.
 * Thread-safe with async/await support.
 */
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Clone)]
pub enum Cache2Error {
    IOError(String),
    DatabaseError(String),
    NotFound,
    InvalidPath,
}

impl std::fmt::Display for Cache2Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Cache2Error::IOError(msg) => write!(f, "I/O error: {}", msg),
            Cache2Error::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            Cache2Error::NotFound => write!(f, "Cache entry not found"),
            Cache2Error::InvalidPath => write!(f, "Invalid cache path"),
        }
    }
}

impl std::error::Error for Cache2Error {}

/// Statistics for L2 cache monitoring
#[derive(Debug, Clone)]
pub struct L2Stats {
    pub size: usize,     // Number of cached items
    pub disk_usage: u64, // Bytes used on disk
    pub hits: u64,
    pub misses: u64,
}

/// Disk-based cache manager
#[derive(Clone)]
pub struct CacheL2 {
    preview_root: PathBuf,
    stats: std::sync::Arc<tokio::sync::Mutex<L2StatsInfo>>,
}

#[derive(Debug, Default)]
struct L2StatsInfo {
    hits: u64,
    misses: u64,
    disk_usage: u64,
}

impl CacheL2 {
    /// Initialize L2 cache with root directory (typically Previews.lrdata/)
    pub fn new(preview_root: PathBuf) -> Result<Self, Cache2Error> {
        // Verify directory exists or can be created
        if !preview_root.exists() {
            std::fs::create_dir_all(&preview_root)
                .map_err(|e| Cache2Error::IOError(e.to_string()))?;
        }

        let stats = std::sync::Arc::new(tokio::sync::Mutex::new(L2StatsInfo::default()));

        Ok(Self {
            preview_root,
            stats,
        })
    }

    /// Get path for a cached preview file
    fn get_preview_path(&self, image_id: u32) -> PathBuf {
        // Use image_id as filename (or could use hash-based directory structure)
        let filename = format!("{}.preview.jpg", image_id);
        self.preview_root.join(filename)
    }

    /// Try to get a preview from disk cache
    pub async fn get(&self, image_id: u32) -> Result<Option<Vec<u8>>, Cache2Error> {
        let path = self.get_preview_path(image_id);

        // Check if file exists
        if !path.exists() {
            let mut stats = self.stats.lock().await;
            stats.misses += 1;
            return Ok(None);
        }

        // Read file
        let data = fs::read(&path).await.map_err(|e| {
            Cache2Error::IOError(format!("Failed to read {}: {}", path.display(), e))
        })?;

        // Record hit
        let mut stats = self.stats.lock().await;
        stats.hits += 1;

        Ok(Some(data))
    }

    /// Store preview on disk
    pub async fn put(&self, image_id: u32, data: Vec<u8>) -> Result<(), Cache2Error> {
        let path = self.get_preview_path(image_id);
        let size = data.len() as u64;

        // Write file
        fs::write(&path, &data).await.map_err(|e| {
            Cache2Error::IOError(format!("Failed to write {}: {}", path.display(), e))
        })?;

        // Update stats
        let mut stats = self.stats.lock().await;
        stats.disk_usage = stats.disk_usage.saturating_add(size);

        Ok(())
    }

    /// Check if preview exists in cache
    pub async fn exists(&self, image_id: u32) -> Result<bool, Cache2Error> {
        let path = self.get_preview_path(image_id);
        Ok(path.exists())
    }

    /// Invalidate (delete) a preview from cache
    pub async fn invalidate(&self, image_id: u32) -> Result<(), Cache2Error> {
        let path = self.get_preview_path(image_id);

        if path.exists() {
            // Get file size before deletion for stats
            if let Ok(metadata) = fs::metadata(&path).await {
                let size = metadata.len();
                let mut stats = self.stats.lock().await;
                stats.disk_usage = stats.disk_usage.saturating_sub(size);
            }

            fs::remove_file(&path).await.map_err(|e| {
                Cache2Error::IOError(format!("Failed to delete {}: {}", path.display(), e))
            })?;
        }

        Ok(())
    }

    /// Clear all previews from disk cache
    pub async fn clear(&self) -> Result<(), Cache2Error> {
        // List all files in preview root
        let mut entries = fs::read_dir(&self.preview_root)
            .await
            .map_err(|e| Cache2Error::IOError(format!("Failed to read directory: {}", e)))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| Cache2Error::IOError(format!("Failed to read entry: {}", e)))?
        {
            let path = entry.path();
            if path.is_file() {
                fs::remove_file(path)
                    .await
                    .map_err(|e| Cache2Error::IOError(e.to_string()))?;
            }
        }

        // Reset stats
        let mut stats = self.stats.lock().await;
        stats.disk_usage = 0;

        Ok(())
    }

    /// Get disk usage statistics
    pub async fn get_stats(&self) -> Result<L2Stats, Cache2Error> {
        // Count files and measure disk usage
        let mut size = 0;
        let mut disk_usage = 0u64;

        let mut entries = fs::read_dir(&self.preview_root)
            .await
            .map_err(|e| Cache2Error::IOError(format!("Failed to read directory: {}", e)))?;

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| Cache2Error::IOError(format!("Failed to read entry: {}", e)))?
        {
            let path = entry.path();
            if path.is_file() {
                size += 1;
                if let Ok(metadata) = fs::metadata(&path).await {
                    disk_usage += metadata.len();
                }
            }
        }

        let stats = self.stats.lock().await;
        Ok(L2Stats {
            size,
            disk_usage,
            hits: stats.hits,
            misses: stats.misses,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_l2_cache_creation() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf());
        assert!(cache.is_ok());
    }

    #[tokio::test]
    async fn test_l2_cache_put_get() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf()).expect("Failed to create cache");

        let test_data = vec![1, 2, 3, 4, 5];
        cache
            .put(1, test_data.clone())
            .await
            .expect("Failed to put");

        let retrieved = cache
            .get(1)
            .await
            .expect("Failed to get")
            .expect("Data not found");
        assert_eq!(retrieved, test_data);
    }

    #[tokio::test]
    async fn test_l2_cache_miss() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf()).expect("Failed to create cache");

        let result = cache.get(999).await.expect("Failed to get");
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_l2_cache_exists() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf()).expect("Failed to create cache");

        cache.put(1, vec![1, 2, 3]).await.expect("Failed to put");

        assert!(cache.exists(1).await.expect("Failed to check exists"));
        assert!(!cache.exists(999).await.expect("Failed to check exists"));
    }

    #[tokio::test]
    async fn test_l2_cache_invalidate() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf()).expect("Failed to create cache");

        cache.put(1, vec![1, 2, 3]).await.expect("Failed to put");

        assert!(cache.exists(1).await.expect("Failed to check"));
        cache.invalidate(1).await.expect("Failed to invalidate");
        assert!(!cache.exists(1).await.expect("Failed to check"));
    }

    #[tokio::test]
    async fn test_l2_cache_clear() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf()).expect("Failed to create cache");

        cache.put(1, vec![1]).await.expect("Failed to put");
        cache.put(2, vec![2]).await.expect("Failed to put");
        cache.put(3, vec![3]).await.expect("Failed to put");

        cache.clear().await.expect("Failed to clear");

        assert!(!cache.exists(1).await.expect("Failed to check"));
        assert!(!cache.exists(2).await.expect("Failed to check"));
        assert!(!cache.exists(3).await.expect("Failed to check"));
    }

    #[tokio::test]
    async fn test_l2_cache_stats() {
        let temp_dir = TempDir::new().unwrap();
        let cache = CacheL2::new(temp_dir.path().to_path_buf()).expect("Failed to create cache");

        cache.put(1, vec![1; 100]).await.expect("Failed to put");
        cache.put(2, vec![2; 200]).await.expect("Failed to put");

        let stats = cache.get_stats().await.expect("Failed to get stats");
        assert_eq!(stats.size, 2);
        assert_eq!(stats.disk_usage, 300);
    }
}

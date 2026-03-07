-- Migration 007: Cache Metadata Tracking
-- Stores metadata about cached items for monitoring and invalidation
-- Phase 6.1: Système de Cache Multiniveau

CREATE TABLE IF NOT EXISTS cache_metadata (
    image_id INTEGER PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
    cached_at INTEGER NOT NULL,          -- Unix timestamp when cached
    last_accessed INTEGER NOT NULL,      -- Unix timestamp of last access (LRU tracking)
    size_bytes INTEGER NOT NULL,         -- Size of cached data
    source TEXT NOT NULL DEFAULT 'L2',   -- 'L1' (memory) or 'L2' (disk)
    invalidated_at INTEGER,              -- NULL = valid, timestamp = marked stale
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indices for frequent queries
CREATE INDEX IF NOT EXISTS idx_cache_metadata_image_id ON cache_metadata(image_id);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_source ON cache_metadata(source);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_last_accessed ON cache_metadata(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_invalidated ON cache_metadata(invalidated_at);

-- Cache statistics table (aggregate monitoring)
CREATE TABLE IF NOT EXISTS cache_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,          -- Unix timestamp
    l1_size INTEGER NOT NULL,            -- Number of items in L1
    l1_capacity INTEGER NOT NULL,        -- L1 max capacity
    l1_hits INTEGER NOT NULL,            -- Cumulative L1 cache hits
    l1_misses INTEGER NOT NULL,          -- Cumulative L1 cache misses
    l2_size INTEGER NOT NULL,            -- Number of items in L2
    l2_disk_usage_bytes INTEGER NOT NULL,-- Total disk usage for L2
    l2_hits INTEGER NOT NULL,            -- Cumulative L2 cache hits
    l2_misses INTEGER NOT NULL,          -- Cumulative L2 cache misses
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_cache_statistics_timestamp ON cache_statistics(timestamp DESC);

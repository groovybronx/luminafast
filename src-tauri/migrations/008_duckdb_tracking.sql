-- Phase 6.2 — DuckDB OLAP Analytics Tracking
--
-- Track synchronization state from SQLite to DuckDB
-- to enable incremental syncs and performance monitoring.

CREATE TABLE IF NOT EXISTS duckdb_sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row constraint
    last_sync_ts TEXT NOT NULL,             -- ISO 8601 timestamp of last successful sync
    total_records INTEGER NOT NULL DEFAULT 0,
    sync_duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initialize with current timestamp
INSERT OR IGNORE INTO duckdb_sync_metadata (id, last_sync_ts, total_records, sync_duration_ms)
VALUES (1, datetime('now'), 0, 0);

-- Trigger to update `updated_at` on changes
CREATE TRIGGER IF NOT EXISTS duckdb_sync_metadata_update
AFTER UPDATE ON duckdb_sync_metadata
FOR EACH ROW
BEGIN
    UPDATE duckdb_sync_metadata
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

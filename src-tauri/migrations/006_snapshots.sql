-- Migration 006: Edit Snapshots Table
-- Stores named snapshots of edit states for time-travel UI
-- Phase 4.3: Historique & Snapshots UI

CREATE TABLE IF NOT EXISTS edit_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    snapshot_data TEXT NOT NULL,  -- JSON array of EventDTO
    event_ids TEXT NOT NULL,      -- JSON array of event IDs (for reference)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(image_id, name)  -- Prevent duplicate snapshot names per image
);

-- Indices for frequent queries
CREATE INDEX IF NOT EXISTS idx_snapshots_image_id ON edit_snapshots(image_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON edit_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_image_created ON edit_snapshots(image_id, created_at DESC);

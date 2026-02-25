-- Phase 4.3 — Historique & Snapshots (Extended Schema)
-- Replaces the basic edit_snapshots table with multi-snapshot per image support

-- Drop old table if exists (one snapshot per image)
DROP TABLE IF EXISTS edit_snapshots;

-- New table: multiple named snapshots per image
CREATE TABLE IF NOT EXISTS edit_snapshots (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id             INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  name                 TEXT    NOT NULL,
  description          TEXT,
  event_count          INTEGER NOT NULL,  -- Number of events replayed to create this snapshot
  snapshot_state       TEXT    NOT NULL,  -- JSON serialized EditStateDTO { exposure: 0.5, contrast: -0.2, ... }
  created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  branch_from_event_id INTEGER REFERENCES edit_events(id),

  UNIQUE(image_id, name)  -- Can't have duplicate snapshot names per image
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_edit_snapshots_image_id ON edit_snapshots(image_id);
CREATE INDEX IF NOT EXISTS idx_edit_snapshots_created_at ON edit_snapshots(created_at DESC);

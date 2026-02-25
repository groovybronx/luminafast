-- Phase 4.1 — Event Sourcing Engine
-- Tables for non-destructive edit history

CREATE TABLE IF NOT EXISTS edit_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id   INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  event_type TEXT    NOT NULL,  -- 'EXPOSURE', 'CONTRAST', 'SATURATION', 'CROP', 'WHITE_BALANCE', etc.
  payload    TEXT    NOT NULL,  -- JSON: { "param": "exposure", "value": 0.75, "prev_value": 0.0 }
  is_undone  INTEGER NOT NULL DEFAULT 0,  -- 1 = annulé (soft-undo)
  session_id TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edit_events_image_id ON edit_events(image_id, is_undone, created_at);

-- Phase 4.3 — Extended schema: multiple named snapshots per image
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

CREATE INDEX IF NOT EXISTS idx_edit_snapshots_image_id ON edit_snapshots(image_id);
CREATE INDEX IF NOT EXISTS idx_edit_snapshots_created_at ON edit_snapshots(created_at DESC);

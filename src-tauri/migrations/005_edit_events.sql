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

CREATE TABLE IF NOT EXISTS edit_snapshots (
  image_id    INTEGER PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  snapshot    TEXT    NOT NULL,  -- JSON: état complet { "exposure": 0.5, "contrast": -0.2, ... }
  event_count INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

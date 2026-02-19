-- Migration 002_ingestion_sessions
-- Add tables for real-time ingestion session tracking

-- Table to track ingestion sessions
CREATE TABLE ingestion_sessions (
    id TEXT PRIMARY KEY,  -- UUID as string
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT CHECK(status IN ('scanning','ingesting','completed','error','stopped')) DEFAULT 'scanning',
    total_files INTEGER DEFAULT 0,
    ingested_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    skipped_files INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    avg_processing_time_ms REAL DEFAULT 0.0,
    error_message TEXT
);

-- Table to track individual file ingestion status
CREATE TABLE ingestion_file_status (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES ingestion_sessions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    blake3_hash TEXT,
    status TEXT CHECK(status IN ('pending','processing','ingested','failed','skipped')) DEFAULT 'pending',
    processing_time_ms INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_ingestion_sessions_status ON ingestion_sessions(status);
CREATE INDEX idx_ingestion_sessions_started_at ON ingestion_sessions(started_at);
CREATE INDEX idx_ingestion_file_status_session_id ON ingestion_file_status(session_id);
CREATE INDEX idx_ingestion_file_status_status ON ingestion_file_status(status);
CREATE INDEX idx_ingestion_file_status_blake3_hash ON ingestion_file_status(blake3_hash);

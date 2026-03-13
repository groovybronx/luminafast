-- Fix Preview Schema Misalignment (MAINTENANCE-PHASE-2.3)
-- Migration 007_fix_previews_schema
-- AVERTISSEMENT :
-- Cette migration n'est pas idempotente et suppose que la table 'previews' existe au lancement.
-- Si la table de backup 'previews_backup_007' n'existe pas, l'INSERT échouera.
-- En cas d'erreur en développement, il suffit de supprimer la base et de relancer toutes les migrations.
-- (Aligné sur la logique des migrations précédentes)
-- STEP 1: Backup existing previews table and recreate with new schema
-- ============================================================================

-- Rename old table for safe migration
ALTER TABLE previews RENAME TO previews_backup_007;

-- Create new previews table with aligned schema
CREATE TABLE previews (
    id INTEGER PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    source_hash TEXT NOT NULL, -- BLAKE3 hash of source file (unicité garantie par UNIQUE(image_id, preview_type))
    preview_type TEXT NOT NULL CHECK(preview_type IN ('thumbnail', 'standard', 'onetoone')),
    relative_path TEXT NOT NULL, -- CHANGED: Relative path to cache dir (e.g., 'thumbnail/hash.jpg')
    file_size INTEGER NOT NULL, -- Size of preview file in bytes
    width INTEGER NOT NULL, -- Preview width in pixels
    height INTEGER NOT NULL, -- Preview height in pixels
    generation_time INTEGER NOT NULL, -- Generation duration in milliseconds
    quality INTEGER NOT NULL DEFAULT 85, -- JPEG quality (1-100)
    access_count INTEGER NOT NULL DEFAULT 0, -- NEW: Access count for LRU (Phase 6.1)
    last_accessed TEXT NOT NULL DEFAULT (datetime('now')), -- NEW: Last access timestamp for LRU (Phase 6.1)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- One preview per type per image
    UNIQUE(image_id, preview_type)
);

-- ============================================================================
-- STEP 2: Migrate data from backup to new table
-- ============================================================================

INSERT INTO previews
(id, image_id, source_hash, preview_type, relative_path, file_size, width, height,
 generation_time, quality, access_count, last_accessed, created_at, updated_at)
SELECT id, image_id, source_hash, preview_type, file_path, file_size, width, height,
       generation_time, quality, 0, datetime('now'), created_at, updated_at
FROM previews_backup_007;

-- ============================================================================
-- STEP 3: Cleanup and recreate indexes with LRU optimization
-- ============================================================================

DROP TABLE previews_backup_007;

-- Performance indexes (existing)
CREATE INDEX idx_previews_image_id ON previews(image_id);
CREATE INDEX idx_previews_source_hash ON previews(source_hash);
CREATE INDEX idx_previews_preview_type ON previews(preview_type);
CREATE INDEX idx_previews_created_at ON previews(created_at);

-- NEW: Indexes for Phase 6.1 LRU cache operations
CREATE INDEX idx_previews_last_accessed ON previews(last_accessed);
CREATE INDEX idx_previews_access_count ON previews(access_count);

-- ============================================================================
-- STEP 4: Recreate database triggers (drop old ones first)
-- ============================================================================

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_previews_timestamp;
DROP TRIGGER IF EXISTS update_preview_cache_metadata_timestamp;
DROP TRIGGER IF EXISTS increment_preview_count;
DROP TRIGGER IF EXISTS decrement_preview_count;

-- Auto-update timestamp on preview modifications
CREATE TRIGGER update_previews_timestamp
AFTER UPDATE ON previews
BEGIN
    UPDATE previews SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_preview_cache_metadata_timestamp
AFTER UPDATE ON preview_cache_metadata
BEGIN
    UPDATE preview_cache_metadata SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-maintain cache statistics on insert
CREATE TRIGGER increment_preview_count
AFTER INSERT ON previews
BEGIN
    INSERT OR IGNORE INTO preview_cache_metadata (preview_type, total_previews, total_size)
    VALUES (NEW.preview_type, 0, 0);

    UPDATE preview_cache_metadata
    SET total_previews = total_previews + 1,
        total_size = total_size + NEW.file_size,
        updated_at = datetime('now')
    WHERE preview_type = NEW.preview_type;
END;

-- Auto-maintain cache statistics on delete
CREATE TRIGGER decrement_preview_count
AFTER DELETE ON previews
BEGIN
    UPDATE preview_cache_metadata
    SET total_previews = total_previews - 1,
        total_size = total_size - OLD.file_size,
        updated_at = datetime('now')
    WHERE preview_type = OLD.preview_type;
END;

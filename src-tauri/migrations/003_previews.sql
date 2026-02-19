-- Preview Database Schema for LuminaFast
-- Migration 003_previews
-- Phase 2.3 - Génération de Previews (Pyramide d'Images)

-- Table principale pour les previews générées
CREATE TABLE previews (
    id INTEGER PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    source_hash TEXT NOT NULL, -- BLAKE3 hash du fichier source
    preview_type TEXT NOT NULL CHECK(preview_type IN ('thumbnail', 'standard', 'onetoone')),
    file_path TEXT NOT NULL, -- Chemin vers le fichier preview généré
    file_size INTEGER NOT NULL, -- Taille du fichier preview en bytes
    width INTEGER NOT NULL, -- Largeur du preview
    height INTEGER NOT NULL, -- Hauteur du preview
    generation_time INTEGER NOT NULL, -- Temps de génération en ms
    quality INTEGER NOT NULL DEFAULT 85, -- Qualité JPEG (1-100)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    -- Contrainte d'unicité : une seule preview par type par image
    UNIQUE(image_id, preview_type)
);

-- Métadonnées du cache de previews pour optimisation
CREATE TABLE preview_cache_metadata (
    id INTEGER PRIMARY KEY,
    preview_type TEXT NOT NULL,
    total_previews INTEGER NOT NULL DEFAULT 0,
    total_size INTEGER NOT NULL DEFAULT 0, -- Taille totale en bytes
    last_cleanup TEXT, -- Date du dernier nettoyage
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(preview_type)
);

-- Journal des événements de génération pour debugging
CREATE TABLE preview_generation_log (
    id INTEGER PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    source_hash TEXT NOT NULL,
    preview_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('started', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    generation_time INTEGER, -- Temps en ms
    file_size INTEGER, -- Taille générée en bytes
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index pour performance
CREATE INDEX idx_previews_image_id ON previews(image_id);
CREATE INDEX idx_previews_source_hash ON previews(source_hash);
CREATE INDEX idx_previews_preview_type ON previews(preview_type);
CREATE INDEX idx_previews_created_at ON previews(created_at);
CREATE INDEX idx_preview_generation_log_image_id ON preview_generation_log(image_id);
CREATE INDEX idx_preview_generation_log_created_at ON preview_generation_log(created_at);

-- Trigger pour mettre à jour updated_at automatiquement
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

-- Trigger pour maintenir les statistiques du cache automatiquement
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

CREATE TRIGGER decrement_preview_count 
AFTER DELETE ON previews
BEGIN
    UPDATE preview_cache_metadata 
    SET total_previews = total_previews - 1,
        total_size = total_size - OLD.file_size,
        updated_at = datetime('now')
    WHERE preview_type = OLD.preview_type;
END;

-- Insertion des métadonnées initiales pour chaque type de preview
INSERT OR IGNORE INTO preview_cache_metadata (preview_type, total_previews, total_size) VALUES
('thumbnail', 0, 0),
('standard', 0, 0),
('onetoone', 0, 0);

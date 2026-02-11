-- Initial schema for LuminaFast catalogue database
-- Migration 001_initial
-- Based on plan specification: Phase 1.1 — Schéma SQLite du Catalogue

-- Table pivot
CREATE TABLE images (
    id INTEGER PRIMARY KEY,
    blake3_hash TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    extension TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    orientation INTEGER DEFAULT 0,
    file_size_bytes INTEGER,
    captured_at TEXT,
    imported_at TEXT DEFAULT (datetime('now')),
    folder_id INTEGER REFERENCES folders(id)
);

CREATE TABLE folders (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    volume_name TEXT,
    parent_id INTEGER REFERENCES folders(id)
);

CREATE TABLE exif_metadata (
    image_id INTEGER PRIMARY KEY REFERENCES images(id),
    iso INTEGER,
    aperture REAL,        -- f-number
    shutter_speed REAL,   -- log2(seconds) pour tri efficace
    focal_length REAL,
    lens TEXT,
    camera_make TEXT,
    camera_model TEXT,
    gps_lat REAL,
    gps_lon REAL,
    color_space TEXT
);

CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('static','smart','quick')) DEFAULT 'static',
    parent_id INTEGER REFERENCES collections(id),
    smart_query TEXT,     -- JSON pour smart collections
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE collection_images (
    collection_id INTEGER REFERENCES collections(id),
    image_id INTEGER REFERENCES images(id),
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (collection_id, image_id)
);

CREATE TABLE image_state (
    image_id INTEGER PRIMARY KEY REFERENCES images(id),
    rating INTEGER DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
    flag TEXT CHECK(flag IN ('pick','reject',NULL)),
    color_label TEXT
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES tags(id)
);

CREATE TABLE image_tags (
    image_id INTEGER REFERENCES images(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (image_id, tag_id)
);

-- Index pour performance
CREATE INDEX idx_images_blake3_hash ON images(blake3_hash);
CREATE INDEX idx_images_filename ON images(filename);
CREATE INDEX idx_images_captured_at ON images(captured_at);
CREATE INDEX idx_images_imported_at ON images(imported_at);
CREATE INDEX idx_images_folder_id ON images(folder_id);
CREATE INDEX idx_folders_path ON folders(path);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_collections_type ON collections(type);
CREATE INDEX idx_collections_parent_id ON collections(parent_id);
CREATE INDEX idx_image_state_rating ON image_state(rating);
CREATE INDEX idx_image_state_flag ON image_state(flag);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_parent_id ON tags(parent_id);

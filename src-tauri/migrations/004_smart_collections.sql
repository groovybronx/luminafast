-- Migration 004_smart_collections
-- Phase 3.3: Smart Collections — ajout colonne smart_criteria + index type

ALTER TABLE collections ADD COLUMN smart_criteria TEXT;

-- Index pour optimiser les requêtes par type
CREATE INDEX IF NOT EXISTS idx_collections_type ON collections(type);

-- Migration 004: Add is_online column and name column to folders table
-- Tracks whether a volume/folder is currently mounted/accessible
ALTER TABLE folders ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE folders ADD COLUMN name TEXT DEFAULT '';

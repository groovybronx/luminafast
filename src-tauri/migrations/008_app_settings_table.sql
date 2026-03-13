-- Migration 008: Application Settings Persistence
-- Single-row settings table with JSON blob storage
-- Constraint id = 1 ensures only one row exists

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings on first run
-- If row already exists (id=1), ignore
INSERT OR IGNORE INTO app_settings (id, settings_json)
VALUES (1, '{"storage":{"catalogue_root":"","database_path":"","previews_path":"","smart_previews_path":""},"cache":{"l1_limit_mb":512,"l2_limit_gb":4,"l3_mode":"auto","prune_threshold_percent":85,"eviction_priority":"lru"},"preview":{"thumbnail_size_px":160,"thumbnail_quality":80,"standard_size_px":1440,"standard_quality":85,"native_percentage":100,"native_quality":90,"auto_generate":true,"background_processing":true,"parallel_workers":4},"keyboard":{},"user":{"full_name":"","email":"","organization":"","license_key":"","license_type":"free"},"ai":{"enabled":false,"provider":"openai","api_key":"","face_recognition_model":"","auto_tagging_model":"","smart_descriptions_model":"","confidence_threshold":0.8,"local_model_path":"","privacy_mode":true},"appearance":{"theme":"auto","font_size_percent":100,"sidebar_position":"left","show_grid_lines":true,"filmstrip_position":"bottom","tooltip_delay_ms":400,"window_state":"restore"},"telemetry_enabled":false,"last_updated":"2026-03-13T00:00:00Z"}');

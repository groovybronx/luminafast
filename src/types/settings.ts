// Types principaux pour Settings professionnel LuminaFast

export interface StorageConfig {
  catalogue_root: string;
  database_path: string;
  previews_path: string;
  smart_previews_path: string;
}

export interface CacheConfig {
  l1_limit_mb: number;
  l2_limit_gb: number;
  l3_mode: 'auto' | 'manual';
  prune_threshold_percent: number;
  eviction_priority: 'lru' | 'lfu' | 'fifo';
}

export interface PreviewConfig {
  thumbnail_size_px: 160 | 240 | 320;
  thumbnail_quality: number;
  standard_size_px: 720 | 1440 | 2880;
  standard_quality: number;
  native_percentage: 90 | 95 | 100;
  native_quality: number;
  export_format_default?: 'jpeg' | 'tiff';
  auto_generate: boolean;
  background_processing: boolean;
  parallel_workers: number;
}

export interface KeyboardShortcuts {
  [commandName: string]: string;
}

export interface UserProfile {
  full_name: string;
  email: string;
  organization: string;
  license_key: string;
  license_type: 'free' | 'pro' | 'enterprise';
}

export interface AIConfig {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'local' | 'custom';
  api_key: string;
  face_recognition_model: string;
  auto_tagging_model: string;
  smart_descriptions_model: string;
  confidence_threshold: number;
  local_model_path: string;
  privacy_mode: boolean;
}

export interface AppearanceConfig {
  theme: 'auto' | 'light' | 'dark';
  font_size_percent: number;
  sidebar_position: 'left' | 'right';
  show_grid_lines: boolean;
  filmstrip_position: 'bottom' | 'right' | 'hidden';
  tooltip_delay_ms: number;
  window_state: 'restore' | 'fullscreen' | 'windowed';
}

export interface SettingsConfig {
  storage: StorageConfig;
  cache: CacheConfig;
  preview: PreviewConfig;
  keyboard: KeyboardShortcuts;
  user: UserProfile;
  ai: AIConfig;
  appearance: AppearanceConfig;
  telemetry_enabled: boolean;
  last_updated: string;
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import * as settingsService from '../../services/settingsService';
import { SettingsConfig } from '../../types/settings';

// Mock the settingsService module
vi.mock('../../services/settingsService');

/**
 * Create a valid SettingsConfig with all required fields.
 * Used for testing settings persistence workflows.
 */
function validSettings(): SettingsConfig {
  const now = new Date().toISOString();
  return {
    storage: {
      catalogue_root: '/home/user/photos',
      database_path: '/tmp/lf.db',
      previews_path: '/tmp/previews',
      smart_previews_path: '/tmp/smart_previews',
    },
    cache: {
      l1_limit_mb: 256,
      l2_limit_gb: 2,
      l3_mode: 'auto',
      prune_threshold_percent: 80,
      eviction_priority: 'lru',
    },
    preview: {
      thumbnail_size_px: 160,
      thumbnail_quality: 85,
      standard_size_px: 720,
      standard_quality: 90,
      native_percentage: 95,
      native_quality: 95,
      auto_generate: true,
      background_processing: true,
      parallel_workers: 4,
    },
    keyboard: {
      key_theme_toggle: 'Cmd+Shift+T',
      key_fullscreen: 'Cmd+F',
    },
    user: {
      full_name: 'Test User',
      email: 'test@example.com',
      organization: 'Test Org',
      license_key: '',
      license_type: 'free',
    },
    ai: {
      enabled: false,
      provider: 'openai',
      api_key: '',
      face_recognition_model: 'default',
      auto_tagging_model: 'default',
      smart_descriptions_model: 'default',
      confidence_threshold: 0.8,
      local_model_path: '',
      privacy_mode: false,
    },
    appearance: {
      theme: 'auto',
      font_size_percent: 100,
      sidebar_position: 'left',
      show_grid_lines: false,
      filmstrip_position: 'bottom',
      tooltip_delay_ms: 500,
      window_state: 'windowed',
    },
    telemetry_enabled: false,
    last_updated: now,
  };
}

describe('SettingsStore Integration — Phase 6.0.1', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: validSettings() });
    vi.clearAllMocks();
  });

  describe('loadFromDB()', () => {
    it('should call service and update store state with loaded settings', async () => {
      const loaded = validSettings();
      loaded.appearance.theme = 'dark';

      vi.mocked(settingsService.loadSettingsFromDB).mockResolvedValueOnce(loaded);

      const store = useSettingsStore.getState();
      await store.loadFromDB();

      expect(settingsService.loadSettingsFromDB).toHaveBeenCalledTimes(1);
      expect(useSettingsStore.getState().settings.appearance.theme).toBe('dark');
    });

    it('should recover gracefully if service fails', async () => {
      vi.mocked(settingsService.loadSettingsFromDB).mockRejectedValueOnce(
        new Error('Database unavailable'),
      );

      const store = useSettingsStore.getState();
      await store.loadFromDB();

      expect(settingsService.loadSettingsFromDB).toHaveBeenCalled();
      // Store should still be valid (no crash)
      expect(useSettingsStore.getState().settings.storage).toBeDefined();
    });
  });

  describe('saveToDBDebounced()', () => {
    it('should not call service immediately (within debounce window)', async () => {
      const config = validSettings();
      vi.mocked(settingsService.saveSettingsToDB).mockResolvedValueOnce(undefined);

      const store = useSettingsStore.getState();
      store.saveToDBDebounced(config);

      await new Promise((r) => setTimeout(r, 500));
      expect(settingsService.saveSettingsToDB).not.toHaveBeenCalled();
    });

    it('should call service after 1000ms debounce window', async () => {
      const config = validSettings();
      vi.mocked(settingsService.saveSettingsToDB).mockResolvedValueOnce(undefined);

      const store = useSettingsStore.getState();
      store.saveToDBDebounced(config);

      await new Promise((r) => setTimeout(r, 1100));
      expect(settingsService.saveSettingsToDB).toHaveBeenCalledTimes(1);
      expect(settingsService.saveSettingsToDB).toHaveBeenCalledWith(config);
    });

    it('should save only the final config when rapid saves queued', async () => {
      const config1 = validSettings();
      config1.appearance.theme = 'light';

      const config2 = validSettings();
      config2.appearance.theme = 'dark';

      vi.mocked(settingsService.saveSettingsToDB).mockResolvedValueOnce(undefined);

      const store = useSettingsStore.getState();
      store.saveToDBDebounced(config1);
      store.saveToDBDebounced(config2);

      await new Promise((r) => setTimeout(r, 1100));

      // Only called once with final config
      expect(settingsService.saveSettingsToDB).toHaveBeenCalledTimes(1);
      expect(settingsService.saveSettingsToDB).toHaveBeenCalledWith(
        expect.objectContaining({
          appearance: expect.objectContaining({ theme: 'dark' }),
        }),
      );
    });

    it('should update store immediately (optimistic update)', async () => {
      const config = validSettings();
      config.user.full_name = 'New Name';

      vi.mocked(settingsService.saveSettingsToDB).mockResolvedValueOnce(undefined);

      const store = useSettingsStore.getState();
      store.saveToDBDebounced(config);

      // Store updates immediately
      expect(useSettingsStore.getState().settings.user.full_name).toBe('New Name');

      await new Promise((r) => setTimeout(r, 1100));
      expect(settingsService.saveSettingsToDB).toHaveBeenCalled();
    });

    it('should handle service errors without crashing', async () => {
      const config = validSettings();
      vi.mocked(settingsService.saveSettingsToDB).mockRejectedValueOnce(new Error('Write failed'));

      const store = useSettingsStore.getState();
      store.saveToDBDebounced(config);

      await new Promise((r) => setTimeout(r, 1100));
      expect(settingsService.saveSettingsToDB).toHaveBeenCalled();
      // Store remains intact
      expect(useSettingsStore.getState().settings).toBeDefined();
    });
  });

  describe('Load → Modify → Save workflow', () => {
    it('should maintain consistency through full cycle', async () => {
      const loaded = validSettings();
      loaded.cache.l1_limit_mb = 512;

      vi.mocked(settingsService.loadSettingsFromDB).mockResolvedValueOnce(loaded);
      vi.mocked(settingsService.saveSettingsToDB).mockResolvedValueOnce(undefined);

      const store = useSettingsStore.getState();

      // Load
      await store.loadFromDB();
      expect(useSettingsStore.getState().settings.cache.l1_limit_mb).toBe(512);

      // Modify and save
      const modified = validSettings();
      modified.cache.l1_limit_mb = 1024;
      store.saveToDBDebounced(modified);

      expect(useSettingsStore.getState().settings.cache.l1_limit_mb).toBe(1024);

      await new Promise((r) => setTimeout(r, 1100));

      expect(settingsService.saveSettingsToDB).toHaveBeenCalledWith(
        expect.objectContaining({
          cache: expect.objectContaining({ l1_limit_mb: 1024 }),
        }),
      );
    });
  });
});

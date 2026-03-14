import { describe, it, expect } from 'vitest';
import * as settingsService from '@/services/settingsService';
import type { KeyboardShortcuts, SettingsConfig } from '@/types/settings';

/**
 * Helper to create a minimal valid SettingsConfig for testing
 */
function createTestConfig(overrides?: Partial<SettingsConfig>): SettingsConfig {
  return {
    storage: { catalogue_root: '', database_path: '', previews_path: '', smart_previews_path: '' },
    cache: {
      l1_limit_mb: 512,
      l2_limit_gb: 4,
      l3_mode: 'auto',
      prune_threshold_percent: 85,
      eviction_priority: 'lru',
    },
    preview: {
      thumbnail_size_px: 160,
      thumbnail_quality: 80,
      standard_size_px: 1440,
      standard_quality: 85,
      native_percentage: 100,
      native_quality: 90,
      auto_generate: true,
      background_processing: true,
      parallel_workers: 4,
    },
    keyboard: {},
    user: { full_name: '', email: '', organization: '', license_key: '', license_type: 'free' },
    ai: {
      enabled: false,
      provider: 'openai',
      api_key: '',
      face_recognition_model: '',
      auto_tagging_model: '',
      smart_descriptions_model: '',
      confidence_threshold: 0.8,
      local_model_path: '',
      privacy_mode: true,
    },
    appearance: {
      theme: 'auto',
      font_size_percent: 100,
      sidebar_position: 'left',
      show_grid_lines: true,
      filmstrip_position: 'bottom',
      tooltip_delay_ms: 400,
      window_state: 'restore',
    },
    telemetry_enabled: false,
    last_updated: new Date().toISOString(),
    ...overrides,
  };
}

describe('settingsService', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(settingsService.validateEmail('user@example.com')).toBe(true);
      expect(settingsService.validateEmail('john.doe@company.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(settingsService.validateEmail('not-an-email')).toBe(false);
      expect(settingsService.validateEmail('@example.com')).toBe(false);
    });

    it('should accept empty email (optional field)', () => {
      expect(settingsService.validateEmail('')).toBe(true);
    });
  });

  describe('validateLicenseKey', () => {
    it('should accept empty key (optional field)', () => {
      expect(settingsService.validateLicenseKey('')).toBe(true);
    });

    it('should accept uppercase alphanumeric keys with dashes', () => {
      expect(settingsService.validateLicenseKey('ABCD-1234-EFGH')).toBe(true);
      expect(settingsService.validateLicenseKey('PRO-2026-LICENSE-KEY')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(settingsService.validateLicenseKey('abc-123')).toBe(false);
      expect(settingsService.validateLicenseKey('invalid_key!')).toBe(false);
    });
  });

  describe('validatePaths', () => {
    it('should pass validation with valid paths', async () => {
      const config = createTestConfig({
        storage: {
          catalogue_root: '/valid/path',
          database_path: '/valid/path/db.sqlite',
          previews_path: '/valid/path/previews',
          smart_previews_path: '/valid/path/smart',
        },
      });

      const result = await settingsService.validatePaths(config);
      expect(result.valid).toBe(true);
    });

    it('should not throw on legacy payloads missing optional storage paths', async () => {
      const legacy = createTestConfig() as unknown as Record<string, unknown>;
      const storage = legacy.storage as Record<string, unknown>;

      delete storage.previews_path;
      delete storage.smart_previews_path;

      const result = await settingsService.validatePaths(legacy as unknown as SettingsConfig);
      expect(result.valid).toBe(true);
      expect(result.errors['storage.previews_path']).toBeUndefined();
      expect(result.errors['storage.smart_previews_path']).toBeUndefined();
    });
  });

  describe('detectShortcutConflicts', () => {
    it('should return empty array when no conflicts', () => {
      const shortcuts: KeyboardShortcuts = {
        save: 'Ctrl+S',
        open: 'Ctrl+O',
      };

      const conflicts = settingsService.detectShortcutConflicts(shortcuts);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect duplicate key combinations', () => {
      const shortcuts: KeyboardShortcuts = {
        save: 'Ctrl+S',
        open: 'Ctrl+S',
      };

      const conflicts = settingsService.detectShortcutConflicts(shortcuts);
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeApiKeys', () => {
    it('should mask sensitive keys', () => {
      const config = createTestConfig({
        user: {
          full_name: 'John Doe',
          email: 'john@example.com',
          organization: 'Test Org',
          license_key: 'SECRET-LICENSE-KEY-123',
          license_type: 'pro',
        },
        ai: {
          enabled: true,
          provider: 'openai',
          api_key: 'sk-1234567890',
          face_recognition_model: 'model.bin',
          auto_tagging_model: 'tags.bin',
          smart_descriptions_model: 'desc.bin',
          confidence_threshold: 0.8,
          local_model_path: '/models',
          privacy_mode: true,
        },
      });

      const sanitized = settingsService.sanitizeApiKeys(config);

      expect(sanitized.user.license_key).toBe('***MASKED***');
      expect(sanitized.ai.api_key).toBe('***MASKED***');
      expect(sanitized.user.full_name).toBe('John Doe');
    });
  });
});

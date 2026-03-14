import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SettingsConfig } from '@/types/settings';
import { useSettingsStore } from '@/stores/settingsStore';
import * as settingsService from '@/services/settingsService';
import { open } from '@tauri-apps/plugin-dialog';
import SettingsCategoryStorage from '../SettingsCategoryStorage';
import SettingsCategoryCache from '../SettingsCategoryCache';
import SettingsCategoryKeyboardShortcuts from '../SettingsCategoryKeyboardShortcuts';
import SettingsCategoryPreview from '../SettingsCategoryPreview';

function createBaseSettings(): SettingsConfig {
  return {
    storage: {
      catalogue_root: '',
      database_path: '',
      previews_path: '',
      smart_previews_path: '',
    },
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
    user: {
      full_name: '',
      email: '',
      organization: '',
      license_key: '',
      license_type: 'free',
    },
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
  };
}

describe('Settings categories advanced wiring', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: createBaseSettings() });
    vi.restoreAllMocks();
  });

  it('updates cache config through sliders', () => {
    render(<SettingsCategoryCache />);

    fireEvent.change(screen.getByLabelText(/l1 memory limit/i), {
      target: { value: '1024' },
    });

    expect(useSettingsStore.getState().settings.cache.l1_limit_mb).toBe(1024);
  });

  it('runs storage validation and displays error message', async () => {
    vi.spyOn(settingsService, 'validatePaths').mockResolvedValueOnce({
      valid: false,
      errors: { 'storage.catalogue_root': 'Path not accessible' },
    });

    render(<SettingsCategoryStorage />);

    fireEvent.click(screen.getByRole('button', { name: /validate paths/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/path not accessible/i).length).toBeGreaterThan(0);
    });
  });

  it('updates catalogue root via browse dialog selection', async () => {
    vi.mocked(open).mockResolvedValueOnce('/Volumes/Photos');

    render(<SettingsCategoryStorage />);

    const browseButtons = screen.getAllByRole('button', { name: /browse/i });
    const firstBrowseButton = browseButtons[0];
    expect(firstBrowseButton).toBeDefined();
    if (!firstBrowseButton) {
      return;
    }

    fireEvent.click(firstBrowseButton);

    await waitFor(() => {
      expect(useSettingsStore.getState().settings.storage.catalogue_root).toBe('/Volumes/Photos');
    });
  });

  it('updates keyboard shortcut values', () => {
    render(<SettingsCategoryKeyboardShortcuts />);

    fireEvent.change(screen.getByLabelText(/^import$/i), {
      target: { value: 'Ctrl+I' },
    });

    expect(useSettingsStore.getState().settings.keyboard.import).toBe('Ctrl+I');
  });

  it('records keyboard shortcut from keydown event', () => {
    render(<SettingsCategoryKeyboardShortcuts />);

    fireEvent.click(screen.getByRole('button', { name: /record import/i }));
    fireEvent.keyDown(window, { key: 'k', metaKey: true, shiftKey: true });

    expect(useSettingsStore.getState().settings.keyboard.import).toBe('Cmd+Shift+K');
  });

  it('updates default export format in preview settings', () => {
    render(<SettingsCategoryPreview />);

    fireEvent.change(screen.getByLabelText(/format export par défaut/i), {
      target: { value: 'tiff' },
    });

    expect(useSettingsStore.getState().settings.preview.export_format_default).toBe('tiff');
  });
});

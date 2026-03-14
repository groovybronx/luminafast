import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SettingsConfig } from '@/types/settings';
import { useSettingsStore } from '@/stores/settingsStore';
import SettingsCategoryAppearance from '../SettingsCategoryAppearance';
import SettingsCategoryUserProfile from '../SettingsCategoryUserProfile';
import SettingsCategoryAI from '../SettingsCategoryAI';
import SettingsCategoryAbout from '../SettingsCategoryAbout';

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

describe('Settings categories simple wiring', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: createBaseSettings() });
    vi.restoreAllMocks();
  });

  it('updates appearance theme through dropdown', () => {
    render(<SettingsCategoryAppearance />);

    fireEvent.change(screen.getByLabelText(/theme/i), {
      target: { value: 'dark' },
    });

    expect(useSettingsStore.getState().settings.appearance.theme).toBe('dark');
  });

  it('updates profile email and shows validation error', () => {
    render(<SettingsCategoryUserProfile />);

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'invalid-email' },
    });

    expect(useSettingsStore.getState().settings.user.email).toBe('invalid-email');
    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
  });

  it('enables AI and updates confidence slider', () => {
    render(<SettingsCategoryAI />);

    fireEvent.click(screen.getByLabelText(/enable ai features/i));
    expect(useSettingsStore.getState().settings.ai.enabled).toBe(true);

    const confidenceSlider = screen.getByLabelText(/confidence threshold/i);
    fireEvent.change(confidenceSlider, { target: { value: '90' } });

    expect(useSettingsStore.getState().settings.ai.confidence_threshold).toBeCloseTo(0.9, 5);
  });

  it('toggles telemetry and can reset settings', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    useSettingsStore.getState().update('appearance', { theme: 'dark' });

    render(<SettingsCategoryAbout />);

    fireEvent.click(screen.getByLabelText(/enable anonymous telemetry/i));
    expect(useSettingsStore.getState().settings.telemetry_enabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /reset all settings/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(useSettingsStore.getState().settings.appearance.theme).toBe('auto');
  });
});

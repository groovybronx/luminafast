import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsModal } from '../SettingsModal';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SettingsConfig } from '@/types/settings';

function baseSettings(): SettingsConfig {
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
    keyboard: {
      settings: 'Cmd+,',
      import: 'Cmd+I',
    },
    user: {
      full_name: 'Test User',
      email: 'test@example.com',
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

describe('SettingsModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: baseSettings() });
  });

  it('does not render when closed', () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/enregistrer/i)).not.toBeInTheDocument();
  });

  it('renders tabs and allows switching categories', () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const storageTabs = screen.getAllByRole('button', { name: /stockage/i });
    expect(storageTabs.length).toBeGreaterThan(0);

    const appearanceTabs = screen.getAllByRole('button', { name: /apparence/i });
    const firstAppearanceTab = appearanceTabs[0];
    expect(firstAppearanceTab).toBeDefined();
    if (!firstAppearanceTab) {
      return;
    }

    fireEvent.click(firstAppearanceTab);

    expect(screen.getByText(/live preview/i)).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking backdrop', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows validation error and prevents save on invalid email', async () => {
    useSettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        user: {
          ...state.settings.user,
          email: 'invalid-email',
        },
      },
    }));

    const saveMock = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState({ saveToDBDebounced: saveMock });

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    expect(saveMock).not.toHaveBeenCalled();
  });
});

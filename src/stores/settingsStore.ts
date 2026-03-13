import { create } from 'zustand';
import { SettingsConfig } from '../types/settings';
import * as settingsService from '../services/settingsService';

/**
 * Simple debounce utility for async functions
 */
function createAsyncDebounce<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  delayMs: number,
): (...args: T) => Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;

  return (...args: T) => {
    lastArgs = args;

    return new Promise<void>((resolve) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        if (lastArgs) {
          try {
            await fn(...lastArgs);
          } catch (error) {
            console.error('Debounced save failed:', error);
          }
        }
        resolve();
      }, delayMs);
    });
  };
}

const defaultSettings: SettingsConfig = {
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

type CategoryKey = keyof SettingsConfig;
type CategoryValue<K extends CategoryKey> = SettingsConfig[K];

interface SettingsStore {
  settings: SettingsConfig;
  update: <K extends CategoryKey>(category: K, updates: Partial<CategoryValue<K>>) => void;
  resetToDefaults: () => void;
  getSettings: () => SettingsConfig;
  loadFromDB: () => Promise<void>;
  saveToDBDebounced: (config: SettingsConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => {
  // Create debounced save function (1s debounce)
  const debouncedSave = createAsyncDebounce(
    async (config: SettingsConfig) => settingsService.saveSettingsToDB(config),
    1000,
  );

  return {
    settings: defaultSettings,
    update: (category, updates) => {
      set((state) => {
        if (category === 'last_updated' || category === 'telemetry_enabled') {
          return {
            settings: {
              ...state.settings,
              [category]: updates,
              last_updated: new Date().toISOString(),
            },
          };
        }
        const current = state.settings[category];
        if (typeof current === 'object' && current !== null) {
          return {
            settings: {
              ...state.settings,
              [category]: {
                ...current,
                ...updates,
              },
              last_updated: new Date().toISOString(),
            },
          };
        }
        // fallback: assign directly (should not happen except for scalars)
        return {
          settings: {
            ...state.settings,
            [category]: updates,
            last_updated: new Date().toISOString(),
          },
        };
      });
    },
    resetToDefaults: () => set({ settings: defaultSettings }),
    getSettings: () => get().settings,
    loadFromDB: async () => {
      try {
        const loaded = await settingsService.loadSettingsFromDB();
        set({ settings: loaded });
      } catch (error) {
        console.error('Failed to load settings from DB:', error);
        // Fallback to in-memory defaults
        set({ settings: defaultSettings });
      }
    },
    saveToDBDebounced: async (config: SettingsConfig) => {
      // Optimistic update: show change immediately in UI
      set({ settings: config });
      // Debounced backend save
      await debouncedSave(config);
    },
  };
});

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
    export_format_default: 'jpeg',
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
type CategoryUpdate<K extends CategoryKey> =
  CategoryValue<K> extends object ? Partial<CategoryValue<K>> : CategoryValue<K>;

interface SettingsStore {
  settings: SettingsConfig;
  update: <K extends CategoryKey>(category: K, updates: CategoryUpdate<K>) => void;
  resetToDefaults: () => void;
  getSettings: () => SettingsConfig;
  loadFromDB: () => Promise<void>;
  saveToDBDebounced: (config: SettingsConfig) => Promise<void>;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeKeyboard(value: unknown): SettingsConfig['keyboard'] {
  const raw = toRecord(value);
  const entries = Object.entries(raw).filter(([, entry]) => typeof entry === 'string');
  return Object.fromEntries(entries) as SettingsConfig['keyboard'];
}

function normalizeSettingsConfig(value: unknown): SettingsConfig {
  const root = toRecord(value);
  const nowIso = new Date().toISOString();

  const telemetryEnabled =
    typeof root.telemetry_enabled === 'boolean'
      ? root.telemetry_enabled
      : defaultSettings.telemetry_enabled;

  const lastUpdated =
    typeof root.last_updated === 'string' && root.last_updated.trim() ? root.last_updated : nowIso;

  return {
    ...defaultSettings,
    ...root,
    storage: {
      ...defaultSettings.storage,
      ...toRecord(root.storage),
    },
    cache: {
      ...defaultSettings.cache,
      ...toRecord(root.cache),
    },
    preview: {
      ...defaultSettings.preview,
      ...toRecord(root.preview),
    },
    keyboard: normalizeKeyboard(root.keyboard),
    user: {
      ...defaultSettings.user,
      ...toRecord(root.user),
    },
    ai: {
      ...defaultSettings.ai,
      ...toRecord(root.ai),
    },
    appearance: {
      ...defaultSettings.appearance,
      ...toRecord(root.appearance),
    },
    telemetry_enabled: telemetryEnabled,
    last_updated: lastUpdated,
  } as SettingsConfig;
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
        const current = state.settings[category];
        if (typeof current === 'object' && current !== null) {
          const objectUpdates = updates as Partial<CategoryValue<typeof category>>;

          return {
            settings: {
              ...state.settings,
              [category]: {
                ...current,
                ...objectUpdates,
              },
              last_updated: new Date().toISOString(),
            },
          };
        }

        return {
          settings: {
            ...state.settings,
            [category]: updates as CategoryValue<typeof category>,
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
        const normalized = normalizeSettingsConfig(loaded);
        set({ settings: normalized });
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

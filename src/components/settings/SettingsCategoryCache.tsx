import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import SettingDropdown from '@/components/ui/SettingDropdown';
import SettingSlider from '@/components/ui/SettingSlider';

const SettingsCategoryCache: React.FC = () => {
  const cache = useSettingsStore((s) => s.settings.cache);
  const update = useSettingsStore((s) => s.update);

  const l1UsagePercent = Math.min(100, Math.round((256 / cache.l1_limit_mb) * 100));
  const l2UsagePercent = Math.min(100, Math.round((2 / cache.l2_limit_gb) * 100));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Gestion du cache</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingSlider
          label="L1 memory limit (MB)"
          min={100}
          max={2000}
          value={cache.l1_limit_mb}
          onChange={(value) => update('cache', { l1_limit_mb: value })}
        />

        <SettingSlider
          label="L2 disk limit (GB)"
          min={1}
          max={20}
          value={cache.l2_limit_gb}
          onChange={(value) => update('cache', { l2_limit_gb: value })}
        />

        <SettingDropdown
          label="L3 origin mode"
          value={cache.l3_mode}
          options={[
            { label: 'Auto fetch', value: 'auto' },
            { label: 'Manual fetch', value: 'manual' },
          ]}
          onChange={(value) => update('cache', { l3_mode: value as 'auto' | 'manual' })}
        />

        <SettingSlider
          label="Prune threshold (%)"
          min={70}
          max={95}
          value={cache.prune_threshold_percent}
          onChange={(value) => update('cache', { prune_threshold_percent: value })}
        />

        <SettingDropdown
          label="Eviction priority"
          value={cache.eviction_priority}
          options={[
            { label: 'LRU', value: 'lru' },
            { label: 'LFU', value: 'lfu' },
            { label: 'FIFO', value: 'fifo' },
          ]}
          onChange={(value) =>
            update('cache', { eviction_priority: value as 'lru' | 'lfu' | 'fifo' })
          }
        />
      </div>

      <div className="space-y-3 rounded border border-neutral-700 bg-neutral-900 p-4">
        <p className="text-sm text-neutral-200">Estimated usage</p>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
            <span>L1 memory</span>
            <span>{l1UsagePercent}%</span>
          </div>
          <div className="h-2 rounded bg-neutral-800">
            <div className="h-2 rounded bg-blue-500" style={{ width: `${l1UsagePercent}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
            <span>L2 disk</span>
            <span>{l2UsagePercent}%</span>
          </div>
          <div className="h-2 rounded bg-neutral-800">
            <div className="h-2 rounded bg-emerald-500" style={{ width: `${l2UsagePercent}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Clear all cache
        </button>
        <button
          type="button"
          className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Optimize now
        </button>
      </div>
    </div>
  );
};

export default SettingsCategoryCache;

import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import SettingDropdown from '@/components/ui/SettingDropdown';
import SettingSlider from '@/components/ui/SettingSlider';
import SettingToggle from '@/components/ui/SettingToggle';

const SettingsCategoryAppearance: React.FC = () => {
  const appearance = useSettingsStore((s) => s.settings.appearance);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Apparence</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingDropdown
          label="Theme"
          value={appearance.theme}
          options={[
            { label: 'Auto', value: 'auto' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          onChange={(value) => update('appearance', { theme: value as 'auto' | 'light' | 'dark' })}
        />

        <SettingSlider
          label="Font size (%)"
          min={50}
          max={120}
          value={appearance.font_size_percent}
          onChange={(value) => update('appearance', { font_size_percent: value })}
        />

        <SettingDropdown
          label="Sidebar position"
          value={appearance.sidebar_position}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ]}
          onChange={(value) =>
            update('appearance', { sidebar_position: value as 'left' | 'right' })
          }
        />

        <SettingDropdown
          label="Filmstrip position"
          value={appearance.filmstrip_position}
          options={[
            { label: 'Bottom', value: 'bottom' },
            { label: 'Right', value: 'right' },
            { label: 'Hidden', value: 'hidden' },
          ]}
          onChange={(value) =>
            update('appearance', {
              filmstrip_position: value as 'bottom' | 'right' | 'hidden',
            })
          }
        />

        <SettingSlider
          label="Tooltip delay (ms)"
          min={100}
          max={1000}
          step={50}
          value={appearance.tooltip_delay_ms}
          onChange={(value) => update('appearance', { tooltip_delay_ms: value })}
        />

        <SettingDropdown
          label="Window state on startup"
          value={appearance.window_state}
          options={[
            { label: 'Restore', value: 'restore' },
            { label: 'Fullscreen', value: 'fullscreen' },
            { label: 'Windowed', value: 'windowed' },
          ]}
          onChange={(value) =>
            update('appearance', {
              window_state: value as 'restore' | 'fullscreen' | 'windowed',
            })
          }
        />

        <SettingToggle
          label="Show grid lines"
          checked={appearance.show_grid_lines}
          onChange={(checked) => update('appearance', { show_grid_lines: checked })}
        />
      </div>

      <div className="rounded border border-neutral-700 bg-neutral-900 p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Live preview</p>
        <div
          className="rounded bg-neutral-800 p-3"
          style={{ fontSize: `${appearance.font_size_percent}%` }}
        >
          <p className="text-neutral-100">Theme: {appearance.theme}</p>
          <p className="text-neutral-300">Sidebar: {appearance.sidebar_position}</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsCategoryAppearance;

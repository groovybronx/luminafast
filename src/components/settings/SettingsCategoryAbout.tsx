import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import SettingToggle from '@/components/ui/SettingToggle';

const SettingsCategoryAbout: React.FC = () => {
  const telemetryEnabled = useSettingsStore((s) => s.settings.telemetry_enabled);
  const update = useSettingsStore((s) => s.update);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  const appVersion = import.meta.env.VITE_APP_VERSION ?? 'dev';
  const buildInfo = import.meta.env.VITE_BUILD_TIME ?? 'local build';

  const handleReset = () => {
    if (!window.confirm('Reset all settings to defaults?')) {
      return;
    }

    resetToDefaults();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">À propos</h2>

      <div className="rounded border border-neutral-700 bg-neutral-900 p-4 space-y-2">
        <p className="text-sm text-neutral-200">LuminaFast</p>
        <p className="text-xs text-neutral-400">Version: {appVersion}</p>
        <p className="text-xs text-neutral-500">Build: {buildInfo}</p>
      </div>

      <div className="rounded border border-neutral-700 bg-neutral-900 p-4 space-y-2">
        <p className="text-sm text-neutral-200">Credits</p>
        <p className="text-xs text-neutral-400">Tauri, React, Zustand, SQLite, Rust</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="https://github.com/groovybronx/luminafast"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded border border-neutral-600 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
        >
          GitHub
        </a>
        <a
          href="https://github.com/groovybronx/luminafast/issues"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded border border-neutral-600 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
        >
          Support
        </a>
      </div>

      <SettingToggle
        label="Enable anonymous telemetry"
        checked={telemetryEnabled}
        onChange={(checked) => update('telemetry_enabled', checked)}
      />

      <button
        type="button"
        className="rounded border border-red-600 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
        onClick={handleReset}
      >
        Reset all settings
      </button>
    </div>
  );
};

export default SettingsCategoryAbout;

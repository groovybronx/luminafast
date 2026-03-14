import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import * as settingsService from '@/services/settingsService';
import SettingDropdown from '@/components/ui/SettingDropdown';
import SettingTextInput from '@/components/ui/SettingTextInput';
import ValidationBadge from '@/components/ui/ValidationBadge';
import {
  getDefaultKeyboardShortcuts,
  getLightroomKeyboardShortcuts,
} from '@/lib/keyboardShortcuts';

function isStringMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === 'string');
}

function formatShortcutFromEvent(event: KeyboardEvent): string | null {
  const key = event.key;
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
  const keyLower = normalizedKey.toLowerCase();

  if (['control', 'shift', 'alt', 'meta'].includes(keyLower)) {
    return null;
  }

  const tokens: string[] = [];

  if (event.metaKey) {
    tokens.push('Cmd');
  }

  if (event.ctrlKey) {
    tokens.push('Ctrl');
  }

  if (event.altKey) {
    tokens.push('Alt');
  }

  if (event.shiftKey) {
    tokens.push('Shift');
  }

  tokens.push(key.length === 1 ? key.toUpperCase() : normalizedKey);
  return tokens.join('+');
}

const SettingsCategoryKeyboardShortcuts: React.FC = () => {
  const keyboard = useSettingsStore((s) => s.settings.keyboard);
  const update = useSettingsStore((s) => s.update);
  const [profile, setProfile] = useState<'lightroom' | 'adobe' | 'custom'>('custom');
  const [recordingCommand, setRecordingCommand] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultShortcuts = useMemo(() => getDefaultKeyboardShortcuts(), []);
  const lightroomShortcuts = useMemo(() => getLightroomKeyboardShortcuts(), []);

  const mergedShortcuts = useMemo(
    () => ({
      ...defaultShortcuts,
      ...keyboard,
    }),
    [keyboard, defaultShortcuts],
  );

  const conflicts = settingsService.detectShortcutConflicts(mergedShortcuts);

  const applyProfile = (targetProfile: 'lightroom' | 'adobe' | 'custom') => {
    setProfile(targetProfile);

    if (targetProfile === 'lightroom') {
      update('keyboard', lightroomShortcuts);
      return;
    }

    if (targetProfile === 'adobe') {
      update('keyboard', defaultShortcuts);
    }
  };

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify(mergedShortcuts, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'luminafast-shortcuts.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importProfile = async (file: File) => {
    const content = await file.text();
    const parsed: unknown = JSON.parse(content);

    if (!isStringMap(parsed)) {
      return;
    }

    update('keyboard', parsed);
    setProfile('custom');
  };

  useEffect(() => {
    if (!recordingCommand) {
      return;
    }

    const handleRecordKeydown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecordingCommand(null);
        return;
      }

      const shortcut = formatShortcutFromEvent(event);
      if (!shortcut) {
        return;
      }

      update('keyboard', { [recordingCommand]: shortcut });
      setProfile('custom');
      setRecordingCommand(null);
    };

    window.addEventListener('keydown', handleRecordKeydown, true);
    return () => {
      window.removeEventListener('keydown', handleRecordKeydown, true);
    };
  }, [recordingCommand, update]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Raccourcis clavier</h2>

      <SettingDropdown
        label="Profile"
        value={profile}
        options={[
          { label: 'Lightroom compatible', value: 'lightroom' },
          { label: 'Adobe', value: 'adobe' },
          { label: 'Custom', value: 'custom' },
        ]}
        onChange={(value) => applyProfile(value as 'lightroom' | 'adobe' | 'custom')}
      />

      <div className="space-y-4 rounded border border-neutral-700 bg-neutral-900 p-4">
        {Object.entries(mergedShortcuts).map(([command, shortcut]) => (
          <div key={command} className="space-y-2">
            <SettingTextInput
              label={command}
              value={shortcut}
              onChange={(value) => {
                update('keyboard', { [command]: value });
                setProfile('custom');
              }}
              placeholder="Cmd+Shift+K"
            />

            <button
              type="button"
              className={`rounded border px-3 py-1 text-xs ${
                recordingCommand === command
                  ? 'border-blue-500 text-blue-300 bg-blue-950/40'
                  : 'border-neutral-600 text-neutral-200 hover:bg-neutral-800'
              }`}
              onClick={() => {
                setRecordingCommand((current) => (current === command ? null : command));
              }}
              aria-label={`Record ${command}`}
            >
              {recordingCommand === command ? 'Recording... (Esc to cancel)' : 'Record shortcut'}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-neutral-300">Conflicts</p>
        {conflicts.length === 0 ? (
          <ValidationBadge status="valid" message="No shortcut conflict detected" />
        ) : (
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <ValidationBadge key={conflict} status="error" message={conflict} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          onClick={() => {
            update('keyboard', defaultShortcuts);
            setProfile('custom');
          }}
        >
          Reset defaults
        </button>
        <button
          type="button"
          className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          onClick={exportProfile}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          onClick={() => fileInputRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          aria-label="Import keyboard shortcut profile"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            void importProfile(file);
          }}
        />
      </div>
    </div>
  );
};

export default SettingsCategoryKeyboardShortcuts;

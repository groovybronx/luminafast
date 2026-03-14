import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import SettingDropdown from '@/components/ui/SettingDropdown';
import SettingSlider from '@/components/ui/SettingSlider';
import SettingTextInput from '@/components/ui/SettingTextInput';
import SettingMaskedInput from '@/components/ui/SettingMaskedInput';
import SettingToggle from '@/components/ui/SettingToggle';

const SettingsCategoryAI: React.FC = () => {
  const ai = useSettingsStore((s) => s.settings.ai);
  const update = useSettingsStore((s) => s.update);

  const confidencePercent = Math.round(ai.confidence_threshold * 100);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Paramètres AI</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingToggle
          label="Enable AI features"
          checked={ai.enabled}
          onChange={(checked) => update('ai', { enabled: checked })}
        />

        <SettingToggle
          label="Privacy mode (local processing preferred)"
          checked={ai.privacy_mode}
          onChange={(checked) => update('ai', { privacy_mode: checked })}
          disabled={!ai.enabled}
        />

        <SettingDropdown
          label="Provider"
          value={ai.provider}
          options={[
            { label: 'OpenAI', value: 'openai' },
            { label: 'Claude', value: 'claude' },
            { label: 'Local', value: 'local' },
            { label: 'Custom', value: 'custom' },
          ]}
          onChange={(value) =>
            update('ai', {
              provider: value as 'openai' | 'claude' | 'local' | 'custom',
            })
          }
          disabled={!ai.enabled}
        />

        <SettingMaskedInput
          label="API key"
          value={ai.api_key}
          onChange={(value) => update('ai', { api_key: value })}
          placeholder="sk-..."
          disabled={!ai.enabled || ai.provider === 'local'}
        />

        <SettingTextInput
          label="Face recognition model"
          value={ai.face_recognition_model}
          onChange={(value) => update('ai', { face_recognition_model: value })}
          placeholder="builtin / mtcnn / mediapipe"
          disabled={!ai.enabled}
        />

        <SettingTextInput
          label="Auto-tagging model"
          value={ai.auto_tagging_model}
          onChange={(value) => update('ai', { auto_tagging_model: value })}
          placeholder="vision / gpt-4 / claude"
          disabled={!ai.enabled}
        />

        <SettingTextInput
          label="Smart descriptions model"
          value={ai.smart_descriptions_model}
          onChange={(value) => update('ai', { smart_descriptions_model: value })}
          placeholder="gpt-4 / claude"
          disabled={!ai.enabled}
        />

        <SettingSlider
          label="Confidence threshold (%)"
          min={50}
          max={95}
          value={confidencePercent}
          onChange={(value) => update('ai', { confidence_threshold: value / 100 })}
          disabled={!ai.enabled}
        />

        {ai.provider === 'local' ? (
          <SettingTextInput
            label="Local model path"
            value={ai.local_model_path}
            onChange={(value) => update('ai', { local_model_path: value })}
            placeholder="/models"
            disabled={!ai.enabled}
          />
        ) : null}
      </div>

      <button
        type="button"
        className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        disabled={!ai.enabled}
      >
        Test API connection
      </button>
    </div>
  );
};

export default SettingsCategoryAI;

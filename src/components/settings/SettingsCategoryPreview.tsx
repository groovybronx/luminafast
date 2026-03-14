import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import SettingDropdown from '../ui/SettingDropdown';
import SettingSlider from '../ui/SettingSlider';
import SettingToggle from '../ui/SettingToggle';

const THUMBNAIL_SIZES = [160, 240, 320];
const STANDARD_SIZES = [720, 1440, 2880];
const NATIVE_SIZES = [100, 95, 90];

const SettingsCategoryPreview: React.FC = () => {
  const preview = useSettingsStore((s) => s.settings.preview);
  const update = useSettingsStore((s) => s.update);
  const exportFormat = preview.export_format_default ?? 'jpeg';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingDropdown
          label="Format export par défaut"
          value={exportFormat}
          options={[
            { label: 'JPEG', value: 'jpeg' },
            { label: 'TIFF', value: 'tiff' },
          ]}
          onChange={(v: number | string) =>
            update('preview', {
              export_format_default: (String(v).toLowerCase() === 'tiff' ? 'tiff' : 'jpeg') as
                | 'jpeg'
                | 'tiff',
            })
          }
        />
        <SettingDropdown
          label="Taille thumbnail"
          value={preview.thumbnail_size_px}
          options={THUMBNAIL_SIZES.map((v) => ({ label: v + ' px', value: v }))}
          onChange={(v: number | string) =>
            update('preview', { thumbnail_size_px: Number(v) as 160 | 240 | 320 })
          }
        />
        <SettingSlider
          label="Qualité thumbnail"
          min={70}
          max={85}
          value={preview.thumbnail_quality}
          onChange={(v: number) => update('preview', { thumbnail_quality: v })}
        />
        <SettingDropdown
          label="Taille standard"
          value={preview.standard_size_px}
          options={STANDARD_SIZES.map((v) => ({ label: v + ' px', value: v }))}
          onChange={(v: number | string) =>
            update('preview', { standard_size_px: Number(v) as 720 | 1440 | 2880 })
          }
        />
        <SettingSlider
          label="Qualité standard"
          min={85}
          max={95}
          value={preview.standard_quality}
          onChange={(v: number) => update('preview', { standard_quality: v })}
        />
        <SettingDropdown
          label="Taille native"
          value={preview.native_percentage}
          options={NATIVE_SIZES.map((v) => ({ label: v + '%', value: v }))}
          onChange={(v: number | string) =>
            update('preview', { native_percentage: Number(v) as 100 | 95 | 90 })
          }
        />
        <SettingSlider
          label="Qualité native"
          min={90}
          max={100}
          value={preview.native_quality}
          onChange={(v: number) => update('preview', { native_quality: v })}
        />
        <SettingToggle
          label="Générer automatiquement à l'import"
          checked={preview.auto_generate}
          onChange={(v: boolean) => update('preview', { auto_generate: v })}
        />
        <SettingToggle
          label="Traitement en arrière-plan"
          checked={preview.background_processing}
          onChange={(v: boolean) => update('preview', { background_processing: v })}
        />
        <SettingSlider
          label="Nombre de workers parallèles"
          min={1}
          max={8}
          value={preview.parallel_workers}
          onChange={(v: number) => update('preview', { parallel_workers: v })}
        />
      </div>
    </div>
  );
};

export default SettingsCategoryPreview;

import React, { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import * as settingsService from '@/services/settingsService';
import SettingFileInput from '@/components/ui/SettingFileInput';
import ValidationBadge, { ValidationStatus } from '@/components/ui/ValidationBadge';
import { open } from '@tauri-apps/plugin-dialog';

function normalizeDialogSelection(selection: string | string[] | null): string | null {
  if (!selection) {
    return null;
  }

  if (Array.isArray(selection)) {
    return selection[0] ?? null;
  }

  return selection;
}

const SettingsCategoryStorage: React.FC = () => {
  const storage = useSettingsStore((s) => s.settings.storage);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationRan, setValidationRan] = useState(false);

  const getFieldStatus = (field: string): ValidationStatus => {
    if (!validationRan) {
      return 'idle';
    }

    return validationErrors[field] ? 'error' : 'valid';
  };

  const runValidation = async () => {
    const result = await settingsService.validatePaths(settings);
    setValidationErrors(result.errors);
    setValidationRan(true);
  };

  const browseDirectory = async (title: string): Promise<string | null> => {
    const selection = await open({
      title,
      directory: true,
      multiple: false,
    });

    return normalizeDialogSelection(selection);
  };

  const browseFile = async (title: string): Promise<string | null> => {
    const selection = await open({
      title,
      directory: false,
      multiple: false,
      filters: [
        {
          name: 'SQLite database',
          extensions: ['db', 'sqlite', 'sqlite3'],
        },
      ],
    });

    return normalizeDialogSelection(selection);
  };

  const handleBrowseCatalogueRoot = async () => {
    const selectedPath = await browseDirectory('Select catalogue root folder');
    if (selectedPath) {
      update('storage', { catalogue_root: selectedPath });
    }
  };

  const handleBrowseDatabasePath = async () => {
    const selectedPath = await browseFile('Select SQLite database file');
    if (selectedPath) {
      update('storage', { database_path: selectedPath });
    }
  };

  const handleBrowsePreviewsPath = async () => {
    const selectedPath = await browseDirectory('Select previews folder');
    if (selectedPath) {
      update('storage', { previews_path: selectedPath });
    }
  };

  const handleBrowseSmartPreviewsPath = async () => {
    const selectedPath = await browseDirectory('Select smart previews folder');
    if (selectedPath) {
      update('storage', { smart_previews_path: selectedPath });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Emplacements de stockage</h2>

      <div className="space-y-4">
        <div>
          <SettingFileInput
            label="Catalogue root"
            value={storage.catalogue_root}
            onChange={(value) => update('storage', { catalogue_root: value })}
            onBrowse={() => {
              void handleBrowseCatalogueRoot();
            }}
            placeholder="/Users/you/Pictures"
            error={validationErrors['storage.catalogue_root']}
          />
          <div className="mt-2">
            <ValidationBadge
              status={getFieldStatus('storage.catalogue_root')}
              message={
                validationErrors['storage.catalogue_root']
                  ? validationErrors['storage.catalogue_root']
                  : undefined
              }
            />
          </div>
        </div>

        <div>
          <SettingFileInput
            label="Database path"
            value={storage.database_path}
            onChange={(value) => update('storage', { database_path: value })}
            onBrowse={() => {
              void handleBrowseDatabasePath();
            }}
            placeholder="/Users/you/LuminaFast/catalog.db"
            error={validationErrors['storage.database_path']}
          />
          <div className="mt-2">
            <ValidationBadge
              status={getFieldStatus('storage.database_path')}
              message={
                validationErrors['storage.database_path']
                  ? validationErrors['storage.database_path']
                  : undefined
              }
            />
          </div>
        </div>

        <div>
          <SettingFileInput
            label="Previews path"
            value={storage.previews_path}
            onChange={(value) => update('storage', { previews_path: value })}
            onBrowse={() => {
              void handleBrowsePreviewsPath();
            }}
            placeholder="/Volumes/FastDisk/Previews.lrdata"
          />
          <div className="mt-2">
            <ValidationBadge status={getFieldStatus('storage.previews_path')} />
          </div>
        </div>

        <div>
          <SettingFileInput
            label="Smart previews path"
            value={storage.smart_previews_path}
            onChange={(value) => update('storage', { smart_previews_path: value })}
            onBrowse={() => {
              void handleBrowseSmartPreviewsPath();
            }}
            placeholder="Optional"
          />
          <div className="mt-2">
            <ValidationBadge status={getFieldStatus('storage.smart_previews_path')} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        onClick={() => {
          void runValidation();
        }}
      >
        Validate paths
      </button>
    </div>
  );
};

export default SettingsCategoryStorage;

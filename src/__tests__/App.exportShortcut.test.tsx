import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { CatalogImage } from '@/types';
import App from '@/App';
import { ExportService } from '@/services/exportService';
import { useCatalogStore } from '@/stores/catalogStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useFolderStore } from '@/stores/folderStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

vi.mock('@/components/AppInitializer', () => ({
  AppInitializer: () => null,
}));

vi.mock('@/components/shared/GlobalStyles', () => ({
  GlobalStyles: () => null,
}));

vi.mock('@/components/shared/ArchitectureMonitor', () => ({
  ArchitectureMonitor: () => null,
}));

vi.mock('@/components/shared/ImportModal', () => ({
  ImportModal: () => null,
}));

vi.mock('@/components/shared/BatchBar', () => ({
  BatchBar: () => null,
}));

vi.mock('@/components/shared/KeyboardOverlay', () => ({
  KeyboardOverlay: () => null,
}));

vi.mock('@/components/layout/TopNav', () => ({
  TopNav: () => null,
}));

vi.mock('@/components/settings/SettingsModal', () => ({
  SettingsModal: () => null,
}));

vi.mock('@/components/layout/LeftSidebar', () => ({
  LeftSidebar: () => null,
}));

vi.mock('@/components/layout/Toolbar', () => ({
  Toolbar: () => null,
}));

vi.mock('@/components/layout/Filmstrip', () => ({
  Filmstrip: () => null,
}));

vi.mock('@/components/layout/RightSidebar', () => ({
  RightSidebar: () => null,
}));

vi.mock('@/components/library/GridView', () => ({
  GridView: () => null,
}));

vi.mock('@/components/develop/DevelopView', () => ({
  DevelopView: () => null,
}));

function createImage(): CatalogImage {
  return {
    id: 101,
    hash: 'hash-101',
    filename: 'sample.nef',
    urls: {
      thumbnail: 'asset://thumb.jpg',
      standard: 'asset://standard.jpg',
    },
    capturedAt: '2026-03-14T00:00:00Z',
    exif: {
      iso: 100,
      cameraMake: 'Test',
      cameraModel: 'Mock',
      lens: '35mm',
    },
    state: {
      rating: 0,
      flag: null,
      edits: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        temp: 0,
        tint: 0,
        vibrance: 0,
        saturation: 0,
        clarity: 0,
      },
      isSynced: true,
      revision: '1',
      tags: [],
    },
    sizeOnDisk: '1 MB',
  };
}

describe('App export shortcut integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCatalogStore.setState({ images: [createImage()] });
    useCollectionStore.setState({ activeCollectionId: null, activeCollectionImageIds: null });
    useFolderStore.setState({ activeFolderId: null, activeFolderImageIds: null });
    useUiStore.setState({
      activeView: 'library',
      selection: new Set<number>(),
      showImport: false,
      filterText: '',
      ratingFilter: null,
      flagFilter: null,
    });

    const currentSettings = useSettingsStore.getState().settings;
    useSettingsStore.setState({
      settings: {
        ...currentSettings,
        keyboard: {
          ...currentSettings.keyboard,
          export: 'Ctrl+E',
        },
        preview: {
          ...currentSettings.preview,
          export_format_default: 'tiff',
        },
      },
      loadFromDB: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('triggers export from keyboard shortcut with settings-driven tiff format', async () => {
    const exportSpy = vi.spyOn(ExportService, 'exportWithDialog').mockResolvedValue({
      imageId: 101,
      outputPath: '/tmp/sample_edited.tiff',
      format: 'tiff',
      width: 4000,
      height: 3000,
      appliedEditEvents: 4,
      usedSnapshot: false,
    });

    render(<App />);

    fireEvent.keyDown(window, { key: 'e', ctrlKey: true });

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledTimes(1);
    });

    expect(exportSpy).toHaveBeenCalledWith({
      imageId: 101,
      sourceFilename: 'sample.nef',
      format: 'tiff',
    });
  });
});

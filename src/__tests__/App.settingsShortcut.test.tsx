import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CatalogImage } from '@/types';
import App from '@/App';
import { useCatalogStore } from '@/stores/catalogStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useFolderStore } from '@/stores/folderStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

const originalPlatform = window.navigator.platform;

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
  SettingsModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="settings-modal-open">Settings open</div> : null,
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
    id: 301,
    hash: 'hash-301',
    filename: 'settings-shortcut.nef',
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

describe('App settings shortcut integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window.navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    });

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
        keyboard: {},
      },
      loadFromDB: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('opens settings on Ctrl+, when fallback is used on non-macOS', async () => {
    render(<App />);

    expect(screen.queryByTestId('settings-modal-open')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: ',', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('settings-modal-open')).toBeInTheDocument();
    });
  });

  it('opens settings on Cmd+, when fallback is used on macOS', async () => {
    Object.defineProperty(window.navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });

    render(<App />);

    expect(screen.queryByTestId('settings-modal-open')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: ',', metaKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('settings-modal-open')).toBeInTheDocument();
    });
  });
});

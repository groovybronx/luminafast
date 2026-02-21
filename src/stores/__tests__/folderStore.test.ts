import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogService } from '../../services/catalogService';
import type { ImageDTO } from '../../types/dto';
import type { FolderTreeNode } from '../../types/folder';
import { useFolderStore } from '../folderStore';

vi.mock('../../services/catalogService');

describe('useFolderStore', () => {
  const mockTree: FolderTreeNode[] = [
    {
      id: 1,
      name: 'Photos2024',
      path: '/volumes/SSD/Photos2024',
      volume_name: 'SSD',
      is_online: true,
      image_count: 10,
      total_image_count: 30,
      children: [],
    },
  ];

  const mockImages: ImageDTO[] = [
    {
      id: 1,
      blake3_hash: 'hash1',
      filename: 'IMG_0001.CR3',
      extension: 'CR3',
      width: 6000,
      height: 4000,
      rating: undefined,
      flag: undefined,
      captured_at: undefined,
      imported_at: '2024-01-01T00:00:00Z',
      iso: undefined,
      aperture: undefined,
      shutter_speed: undefined,
      focal_length: undefined,
      lens: undefined,
      camera_make: undefined,
      camera_model: undefined,
    },
  ];

  beforeEach(() => {
    // Reset store state
    const store = useFolderStore.getState();
    store.folderTree = [];
    store.activeFolderId = null;
    store.activeFolderImageIds = null;
    store.expandedFolderIds = new Set();
    store.isLoading = false;
    store.error = null;

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const store = useFolderStore.getState();
    expect(store.folderTree).toEqual([]);
    expect(store.activeFolderId).toBeNull();
    expect(store.activeFolderImageIds).toBeNull();
    expect(store.expandedFolderIds).toEqual(new Set());
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should load folder tree', async () => {
    vi.mocked(CatalogService.getFolderTree).mockResolvedValue(mockTree);

    await useFolderStore.getState().loadFolderTree();

    expect(CatalogService.getFolderTree).toHaveBeenCalled();
    expect(useFolderStore.getState().folderTree).toEqual(mockTree);
    expect(useFolderStore.getState().isLoading).toBe(false);
    expect(useFolderStore.getState().error).toBeNull();
  });

  it('should set active folder and load images', async () => {
    vi.mocked(CatalogService.getFolderImages).mockResolvedValue(mockImages);

    await useFolderStore.getState().setActiveFolder(1, true);

    expect(CatalogService.getFolderImages).toHaveBeenCalledWith(1, true);
    expect(useFolderStore.getState().activeFolderId).toBe(1);
    expect(useFolderStore.getState().activeFolderImageIds).toEqual([1]);
    expect(useFolderStore.getState().isLoading).toBe(false);
  });

  it('should clear active folder', async () => {
    // D'abord, définir un dossier actif via setActiveFolder
    vi.mocked(CatalogService.getFolderImages).mockResolvedValue(mockImages);
    await useFolderStore.getState().setActiveFolder(1, false);

    expect(useFolderStore.getState().activeFolderId).toBe(1);

    // Puis le nettoyer
    useFolderStore.getState().clearActiveFolder();

    expect(useFolderStore.getState().activeFolderId).toBeNull();
    expect(useFolderStore.getState().activeFolderImageIds).toBeNull();
  });

  it('should toggle folder expansion', () => {
    useFolderStore.getState().toggleFolderExpanded(1);
    expect(useFolderStore.getState().expandedFolderIds.has(1)).toBe(true);

    useFolderStore.getState().toggleFolderExpanded(1);
    expect(useFolderStore.getState().expandedFolderIds.has(1)).toBe(false);
  });

  it('should handle load error', async () => {
    vi.mocked(CatalogService.getFolderTree).mockRejectedValue(new Error('Failed to load tree'));

    await useFolderStore.getState().loadFolderTree();

    expect(useFolderStore.getState().error).toBe('Failed to load tree');
    expect(useFolderStore.getState().isLoading).toBe(false);
  });
});

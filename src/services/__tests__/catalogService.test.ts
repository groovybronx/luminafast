import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from '@/services/catalogService';

// Mock Tauri internals
const mockTauriInvoke = vi.fn();

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: { invoke: mockTauriInvoke },
  writable: true,
});

describe('CatalogService — Collection Methods (Phase 3.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- deleteCollection ---
  describe('deleteCollection', () => {
    it('should invoke delete_collection with correct collectionId', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await CatalogService.deleteCollection(42);

      expect(mockTauriInvoke).toHaveBeenCalledWith('delete_collection', { collectionId: 42 });
    });

    it('should throw an error when collection is not found', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Collection not found'));

      await expect(CatalogService.deleteCollection(999)).rejects.toThrow('Collection not found');
    });
  });

  // --- renameCollection ---
  describe('renameCollection', () => {
    it('should invoke rename_collection with correct params', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await CatalogService.renameCollection(3, 'New Name');

      expect(mockTauriInvoke).toHaveBeenCalledWith('rename_collection', {
        collectionId: 3,
        name: 'New Name',
      });
    });

    it('should throw when the backend rejects an empty name', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Collection name cannot be empty'));

      await expect(CatalogService.renameCollection(3, '')).rejects.toThrow('Collection name cannot be empty');
    });
  });

  // --- removeImagesFromCollection ---
  describe('removeImagesFromCollection', () => {
    it('should invoke remove_images_from_collection with correct params', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      await CatalogService.removeImagesFromCollection(5, [10, 20, 30]);

      expect(mockTauriInvoke).toHaveBeenCalledWith('remove_images_from_collection', {
        collectionId: 5,
        imageIds: [10, 20, 30],
      });
    });

    it('should throw when collection is not found', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Collection not found'));

      await expect(CatalogService.removeImagesFromCollection(999, [1])).rejects.toThrow('Collection not found');
    });
  });

  // --- getCollectionImages ---
  describe('getCollectionImages', () => {
    it('should return images belonging to the collection', async () => {
      const mockImages = [
        { id: 10, filename: 'img1.CR3', blake3_hash: 'abc', extension: 'CR3', imported_at: '2026-01-01T00:00:00Z' },
        { id: 20, filename: 'img2.RAF', blake3_hash: 'def', extension: 'RAF', imported_at: '2026-01-02T00:00:00Z' },
      ];
      mockTauriInvoke.mockResolvedValue(mockImages);

      const result = await CatalogService.getCollectionImages(7);

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_collection_images', { collectionId: 7 });
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe(10);
      expect(result[1]!.id).toBe(20);
    });

    it('should return empty array for empty collection', async () => {
      mockTauriInvoke.mockResolvedValue([]);

      const result = await CatalogService.getCollectionImages(99);

      expect(result).toEqual([]);
    });

    it('should throw when collection is not found', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Collection not found'));

      await expect(CatalogService.getCollectionImages(999)).rejects.toThrow('Collection not found');
    });
  });
});

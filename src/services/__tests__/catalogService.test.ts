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

// ---------------------------------------------------------------------------
// Phase 3.3 — Smart Collections
// ---------------------------------------------------------------------------
describe('CatalogService — Smart Collection Methods (Phase 3.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- createSmartCollection ---
  describe('createSmartCollection', () => {
    it('should invoke create_smart_collection with camelCase keys', async () => {
      const mockDto = { id: 99, name: 'Best shots', collection_type: 'smart', image_count: 0 };
      mockTauriInvoke.mockResolvedValue(mockDto);

      const criteria = '{"rules":[{"field":"rating","op":"gte","value":4}],"match":"all"}';
      const result = await CatalogService.createSmartCollection('Best shots', criteria);

      expect(mockTauriInvoke).toHaveBeenCalledWith('create_smart_collection', {
        name: 'Best shots',
        criteriaJson: criteria,
      });
      expect(result.id).toBe(99);
      expect(result.collection_type).toBe('smart');
    });

    it('should throw when backend rejects invalid criteria JSON', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Invalid criteria JSON'));

      await expect(
        CatalogService.createSmartCollection('Bad', 'NOT_JSON'),
      ).rejects.toThrow('Invalid criteria JSON');
    });
  });

  // --- evaluateSmartCollection ---
  describe('evaluateSmartCollection', () => {
    it('should invoke evaluate_smart_collection with collectionId and return images', async () => {
      const mockImages = [
        { id: 1, filename: 'a.jpg', blake3_hash: 'x', extension: 'jpg', imported_at: '2026-01-01T00:00:00Z' },
        { id: 2, filename: 'b.jpg', blake3_hash: 'y', extension: 'jpg', imported_at: '2026-01-02T00:00:00Z' },
      ];
      mockTauriInvoke.mockResolvedValue(mockImages);

      const result = await CatalogService.evaluateSmartCollection(12);

      expect(mockTauriInvoke).toHaveBeenCalledWith('evaluate_smart_collection', { collectionId: 12 });
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe(1);
    });

    it('should return empty array when no image matches criteria', async () => {
      mockTauriInvoke.mockResolvedValue([]);

      const result = await CatalogService.evaluateSmartCollection(55);

      expect(result).toEqual([]);
    });

    it('should throw when collection is not found', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Collection not found'));

      await expect(CatalogService.evaluateSmartCollection(999)).rejects.toThrow('Collection not found');
    });
  });

  // --- updateSmartCriteria ---
  describe('updateSmartCriteria', () => {
    it('should invoke update_smart_criteria with camelCase keys', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      const criteria = '{"rules":[{"field":"iso","op":"gte","value":1600}],"match":"all"}';
      await CatalogService.updateSmartCriteria(7, criteria);

      expect(mockTauriInvoke).toHaveBeenCalledWith('update_smart_criteria', {
        collectionId: 7,
        criteriaJson: criteria,
      });
    });

    it('should throw when collection is not of type smart', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Collection is not a smart collection'));

      await expect(
        CatalogService.updateSmartCriteria(3, '{}'),
      ).rejects.toThrow('Collection is not a smart collection');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useCollectionStore } from '../collectionStore';
import { CatalogService } from '../../services/catalogService';
import type { CollectionDTO } from '../../types/dto';
import type { SmartCriteria } from '../../types/collection';

// Mock CatalogService
vi.mock('../../services/catalogService', () => ({
  CatalogService: {
    getCollections: vi.fn(),
    createCollection: vi.fn(),
    createSmartCollection: vi.fn(),
    updateSmartCriteria: vi.fn(),
    deleteCollection: vi.fn(),
    renameCollection: vi.fn(),
    addImagesToCollection: vi.fn(),
    removeImagesFromCollection: vi.fn(),
    getCollectionImages: vi.fn(),
    evaluateSmartCollection: vi.fn(),
  },
}));

const mockCollection = (id: number, name: string, imageCount = 0, collectionType: CollectionDTO['collection_type'] = 'static'): CollectionDTO => ({
  id,
  name,
  collection_type: collectionType,
  image_count: imageCount,
});

describe('collectionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useCollectionStore.setState({
        collections: [],
        activeCollectionId: null,
        activeCollectionImageIds: null,
        isLoading: false,
        error: null,
      });
    });
  });

  it('should initialize with empty state', () => {
    const state = useCollectionStore.getState();
    expect(state.collections).toEqual([]);
    expect(state.activeCollectionId).toBeNull();
    expect(state.activeCollectionImageIds).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('loadCollections', () => {
    it('should load collections from service', async () => {
      const mockCollections = [mockCollection(1, 'Portfolio'), mockCollection(2, 'Voyages', 12)];
      vi.mocked(CatalogService.getCollections).mockResolvedValue(mockCollections);

      await act(async () => {
        await useCollectionStore.getState().loadCollections();
      });

      expect(useCollectionStore.getState().collections).toEqual(mockCollections);
      expect(useCollectionStore.getState().isLoading).toBe(false);
      expect(useCollectionStore.getState().error).toBeNull();
    });

    it('should set error state on failure', async () => {
      vi.mocked(CatalogService.getCollections).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useCollectionStore.getState().loadCollections();
      });

      expect(useCollectionStore.getState().collections).toEqual([]);
      expect(useCollectionStore.getState().error).toContain('Network error');
      expect(useCollectionStore.getState().isLoading).toBe(false);
    });
  });

  describe('createCollection', () => {
    it('should create a collection and add to list', async () => {
      const newCollection = mockCollection(42, 'New Collection');
      vi.mocked(CatalogService.createCollection).mockResolvedValue(newCollection);

      await act(async () => {
        await useCollectionStore.getState().createCollection('New Collection');
      });

      expect(CatalogService.createCollection).toHaveBeenCalledWith('New Collection', 'static', undefined);
      const collections = useCollectionStore.getState().collections;
      expect(collections).toHaveLength(1);
      expect(collections[0]).toEqual(newCollection);
    });

    it('should pass parentId to service when provided', async () => {
      const newCollection = mockCollection(10, 'Sub-collection');
      vi.mocked(CatalogService.createCollection).mockResolvedValue(newCollection);

      await act(async () => {
        await useCollectionStore.getState().createCollection('Sub-collection', 5);
      });

      expect(CatalogService.createCollection).toHaveBeenCalledWith('Sub-collection', 'static', 5);
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection and remove from list', async () => {
      const collections = [mockCollection(1, 'Keep'), mockCollection(2, 'Delete Me')];
      act(() => { useCollectionStore.setState({ collections }); });
      vi.mocked(CatalogService.deleteCollection).mockResolvedValue(undefined);

      await act(async () => {
        await useCollectionStore.getState().deleteCollection(2);
      });

      expect(CatalogService.deleteCollection).toHaveBeenCalledWith(2);
      const remaining = useCollectionStore.getState().collections;
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe(1);
    });

    it('should clear active collection when the active one is deleted', async () => {
      const collections = [mockCollection(1, 'Active'), mockCollection(2, 'Other')];
      act(() => {
        useCollectionStore.setState({
          collections,
          activeCollectionId: 1,
          activeCollectionImageIds: [10, 20],
        });
      });
      vi.mocked(CatalogService.deleteCollection).mockResolvedValue(undefined);

      await act(async () => {
        await useCollectionStore.getState().deleteCollection(1);
      });

      expect(useCollectionStore.getState().activeCollectionId).toBeNull();
      expect(useCollectionStore.getState().activeCollectionImageIds).toBeNull();
    });

    it('should preserve active collection when another is deleted', async () => {
      const collections = [mockCollection(1, 'Active'), mockCollection(2, 'Delete Me')];
      act(() => {
        useCollectionStore.setState({
          collections,
          activeCollectionId: 1,
          activeCollectionImageIds: [10, 20],
        });
      });
      vi.mocked(CatalogService.deleteCollection).mockResolvedValue(undefined);

      await act(async () => {
        await useCollectionStore.getState().deleteCollection(2);
      });

      expect(useCollectionStore.getState().activeCollectionId).toBe(1);
      expect(useCollectionStore.getState().activeCollectionImageIds).toEqual([10, 20]);
    });
  });

  describe('renameCollection', () => {
    it('should rename a collection in the list', async () => {
      const collections = [mockCollection(1, 'Old Name'), mockCollection(2, 'Other')];
      act(() => { useCollectionStore.setState({ collections }); });
      vi.mocked(CatalogService.renameCollection).mockResolvedValue(undefined);

      await act(async () => {
        await useCollectionStore.getState().renameCollection(1, 'New Name');
      });

      expect(CatalogService.renameCollection).toHaveBeenCalledWith(1, 'New Name');
      const updated = useCollectionStore.getState().collections.find((c) => c.id === 1);
      expect(updated?.name).toBe('New Name');
    });

    it('should not modify other collections during rename', async () => {
      const collections = [mockCollection(1, 'First'), mockCollection(2, 'Second')];
      act(() => { useCollectionStore.setState({ collections }); });
      vi.mocked(CatalogService.renameCollection).mockResolvedValue(undefined);

      await act(async () => {
        await useCollectionStore.getState().renameCollection(1, 'Renamed');
      });

      const second = useCollectionStore.getState().collections.find((c) => c.id === 2);
      expect(second?.name).toBe('Second');
    });
  });

  describe('setActiveCollection', () => {
    it('should set active collection and load image ids', async () => {
      const mockImages = [
        { id: 10, filename: 'img1.CR3', blake3_hash: 'abc', extension: 'CR3', imported_at: '2026-01-01T00:00:00Z' },
        { id: 20, filename: 'img2.RAF', blake3_hash: 'def', extension: 'RAF', imported_at: '2026-01-02T00:00:00Z' },
      ];
      vi.mocked(CatalogService.getCollectionImages).mockResolvedValue(mockImages);

      await act(async () => {
        await useCollectionStore.getState().setActiveCollection(5);
      });

      expect(useCollectionStore.getState().activeCollectionId).toBe(5);
      expect(useCollectionStore.getState().activeCollectionImageIds).toEqual([10, 20]);
      expect(useCollectionStore.getState().isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      vi.mocked(CatalogService.getCollectionImages).mockRejectedValue(new Error('Collection not found'));

      await act(async () => {
        await useCollectionStore.getState().setActiveCollection(999);
      });

      expect(useCollectionStore.getState().error).toContain('Collection not found');
    });
  });

  describe('clearActiveCollection', () => {
    it('should reset active collection to null', () => {
      act(() => {
        useCollectionStore.setState({
          activeCollectionId: 3,
          activeCollectionImageIds: [1, 2, 3],
        });
      });

      act(() => { useCollectionStore.getState().clearActiveCollection(); });

      expect(useCollectionStore.getState().activeCollectionId).toBeNull();
      expect(useCollectionStore.getState().activeCollectionImageIds).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 3.3 — Smart Collections
  // ---------------------------------------------------------------------------
  describe('createSmartCollection', () => {
    it('should add the new smart collection to the store', async () => {
      const smartDto = mockCollection(20, 'Top rated', 0, 'smart');
      vi.mocked(CatalogService.createSmartCollection).mockResolvedValue(smartDto);

      const criteria: SmartCriteria = { rules: [{ field: 'rating', op: 'gte', value: 4 }], match: 'all' };
      await act(async () => {
        await useCollectionStore.getState().createSmartCollection('Top rated', criteria);
      });

      expect(CatalogService.createSmartCollection).toHaveBeenCalledWith(
        'Top rated',
        JSON.stringify(criteria),
      );
      const state = useCollectionStore.getState();
      expect(state.collections.find((c) => c.id === 20)).toBeDefined();
      expect(state.collections.find((c) => c.id === 20)?.collection_type).toBe('smart');
    });
  });

  describe('setActiveCollection — smart branch', () => {
    it('should call evaluateSmartCollection for smart collections', async () => {
      const smartCol = mockCollection(30, 'ISO 1600+', 5, 'smart');
      act(() => { useCollectionStore.setState({ collections: [smartCol] }); });

      const mockImages = [
        { id: 101, filename: 'a.jpg', blake3_hash: 'h1', extension: 'jpg', imported_at: '2026-01-01T00:00:00Z' },
        { id: 102, filename: 'b.jpg', blake3_hash: 'h2', extension: 'jpg', imported_at: '2026-01-02T00:00:00Z' },
      ];
      vi.mocked(CatalogService.evaluateSmartCollection).mockResolvedValue(mockImages);

      await act(async () => {
        await useCollectionStore.getState().setActiveCollection(30);
      });

      expect(CatalogService.evaluateSmartCollection).toHaveBeenCalledWith(30);
      expect(CatalogService.getCollectionImages).not.toHaveBeenCalled();
      expect(useCollectionStore.getState().activeCollectionImageIds).toEqual([101, 102]);
    });

    it('should call getCollectionImages for static collections (no regression)', async () => {
      const staticCol = mockCollection(5, 'Portraits', 3, 'static');
      act(() => { useCollectionStore.setState({ collections: [staticCol] }); });

      const mockImages = [
        { id: 50, filename: 'p1.jpg', blake3_hash: 'hh', extension: 'jpg', imported_at: '2026-01-01T00:00:00Z' },
      ];
      vi.mocked(CatalogService.getCollectionImages).mockResolvedValue(mockImages);

      await act(async () => {
        await useCollectionStore.getState().setActiveCollection(5);
      });

      expect(CatalogService.getCollectionImages).toHaveBeenCalledWith(5);
      expect(CatalogService.evaluateSmartCollection).not.toHaveBeenCalled();
      expect(useCollectionStore.getState().activeCollectionImageIds).toEqual([50]);
    });
  });

  describe('updateSmartCriteria', () => {
    it('should call updateSmartCriteria with serialised criteria', async () => {
      vi.mocked(CatalogService.updateSmartCriteria).mockResolvedValue(undefined);
      // Collection non-active : pas de re-évaluation
      act(() => { useCollectionStore.setState({ activeCollectionId: 99 }); });

      const criteria: SmartCriteria = { rules: [{ field: 'flag', op: 'eq', value: 1 }], match: 'all' };
      await act(async () => {
        await useCollectionStore.getState().updateSmartCriteria(7, criteria);
      });

      expect(CatalogService.updateSmartCriteria).toHaveBeenCalledWith(7, JSON.stringify(criteria));
    });

    it('should re-evaluate when updated collection is the active one', async () => {
      vi.mocked(CatalogService.updateSmartCriteria).mockResolvedValue(undefined);
      const mockImages = [
        { id: 5, filename: 'x.jpg', blake3_hash: 'hx', extension: 'jpg', imported_at: '2026-01-01T00:00:00Z' },
      ];
      vi.mocked(CatalogService.evaluateSmartCollection).mockResolvedValue(mockImages);
      act(() => { useCollectionStore.setState({ activeCollectionId: 7 }); });

      const criteria: SmartCriteria = { rules: [{ field: 'rating', op: 'gte', value: 3 }], match: 'all' };
      await act(async () => {
        await useCollectionStore.getState().updateSmartCriteria(7, criteria);
      });

      expect(CatalogService.evaluateSmartCollection).toHaveBeenCalledWith(7);
      expect(useCollectionStore.getState().activeCollectionImageIds).toEqual([5]);
    });
  });
});

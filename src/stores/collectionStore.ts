import { create } from 'zustand';
import type { CollectionDTO } from '../types/dto';
import type { SmartQuery } from '../types/collection';
import { CatalogService } from '../services/catalogService';

interface CollectionStore {
  // État
  collections: CollectionDTO[];
  activeCollectionId: number | null;
  /** IDs des images de la collection active. null = "Toutes les photos" */
  activeCollectionImageIds: number[] | null;
  isLoading: boolean;
  error: string | null;

  // Actions async
  loadCollections: () => Promise<void>;
  createCollection: (name: string, parentId?: number) => Promise<CollectionDTO>;
  createSmartCollection: (
    name: string,
    smartQuery: SmartQuery,
    parentId?: number,
  ) => Promise<CollectionDTO>;
  deleteCollection: (id: number) => Promise<void>;
  renameCollection: (id: number, name: string) => Promise<void>;
  updateSmartCollection: (id: number, smartQuery: SmartQuery) => Promise<void>;
  addImagesToCollection: (collectionId: number, imageIds: number[]) => Promise<void>;
  removeImagesFromCollection: (collectionId: number, imageIds: number[]) => Promise<void>;
  /** Sélectionne une collection et charge ses image IDs depuis SQLite */
  setActiveCollection: (id: number) => Promise<void>;
  /** Revient à "Toutes les photos" */
  clearActiveCollection: () => void;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  // État initial
  collections: [],
  activeCollectionId: null,
  activeCollectionImageIds: null,
  isLoading: false,
  error: null,

  loadCollections: async () => {
    set({ isLoading: true, error: null });
    try {
      const collections = await CatalogService.getCollections();
      set({ collections, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des collections';
      set({ error: message, isLoading: false });
    }
  },

  createCollection: async (name: string, parentId?: number) => {
    const dto = await CatalogService.createCollection(name, 'static', parentId);
    // Ajouter la nouvelle collection à la liste locale
    set((state) => ({
      collections: [...state.collections, dto],
    }));
    return dto;
  },

  createSmartCollection: async (name: string, smartQuery: SmartQuery, parentId?: number) => {
    const smartQueryJson = JSON.stringify(smartQuery);
    const dto = await CatalogService.createSmartCollection(name, smartQueryJson, parentId);
    // Ajouter la nouvelle collection à la liste locale
    set((state) => ({
      collections: [...state.collections, dto],
    }));
    return dto;
  },

  deleteCollection: async (id: number) => {
    await CatalogService.deleteCollection(id);
    set((state) => {
      const collections = state.collections.filter((c) => c.id !== id);
      // Si la collection supprimée était active, revenir à "Toutes les photos"
      const wasActive = state.activeCollectionId === id;
      return {
        collections,
        activeCollectionId: wasActive ? null : state.activeCollectionId,
        activeCollectionImageIds: wasActive ? null : state.activeCollectionImageIds,
      };
    });
  },

  renameCollection: async (id: number, name: string) => {
    await CatalogService.renameCollection(id, name);
    set((state) => ({
      collections: state.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  updateSmartCollection: async (id: number, smartQuery: SmartQuery) => {
    const smartQueryJson = JSON.stringify(smartQuery);
    await CatalogService.updateSmartCollection(id, smartQueryJson);
    // Recharger les résultats et les collections si active
    if (get().activeCollectionId === id) {
      await get().setActiveCollection(id);
    }
  },

  addImagesToCollection: async (collectionId: number, imageIds: number[]) => {
    await CatalogService.addImagesToCollection(collectionId, imageIds);
    // Recharger les collections pour mettre à jour image_count
    await get().loadCollections();
    // Si la collection modifiée est active, recharger les image IDs
    if (get().activeCollectionId === collectionId) {
      const images = await CatalogService.getCollectionImages(collectionId);
      set({ activeCollectionImageIds: images.map((img) => img.id) });
    }
  },

  removeImagesFromCollection: async (collectionId: number, imageIds: number[]) => {
    await CatalogService.removeImagesFromCollection(collectionId, imageIds);
    // Recharger les collections pour mettre à jour image_count
    await get().loadCollections();
    // Si la collection modifiée est active, recharger les image IDs
    if (get().activeCollectionId === collectionId) {
      const images = await CatalogService.getCollectionImages(collectionId);
      set({ activeCollectionImageIds: images.map((img) => img.id) });
    }
  },

  setActiveCollection: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      // Find the collection to check if it's smart
      const collection = get().collections.find((c) => c.id === id);
      const isSmart = collection?.collection_type === 'smart';

      let images;
      if (isSmart) {
        // For smart collections, use get_smart_collection_results
        images = await CatalogService.getSmartCollectionResults(id);
      } else {
        // For static collections, use get_collection_images
        images = await CatalogService.getCollectionImages(id);
      }

      set({
        activeCollectionId: id,
        activeCollectionImageIds: images.map((img) => img.id),
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement de la collection';
      set({ error: message, isLoading: false });
    }
  },

  clearActiveCollection: () => {
    set({
      activeCollectionId: null,
      activeCollectionImageIds: null,
    });
  },
}));

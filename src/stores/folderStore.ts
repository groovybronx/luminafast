import { create } from 'zustand';
import { CatalogService } from '../services/catalogService';
import type { FolderTreeNode } from '../types/folder';

interface FolderStore {
  // État
  folderTree: FolderTreeNode[];
  activeFolderId: number | null;
  /** IDs des images du dossier actif. null = pas de filtre par dossier */
  activeFolderImageIds: number[] | null;
  expandedFolderIds: Set<number>; // pour l'arborescence UI
  isLoading: boolean;
  error: string | null;

  // Actions async
  loadFolderTree: () => Promise<void>;
  /** Sélectionne un dossier et charge ses image IDs depuis SQLite */
  setActiveFolder: (id: number, recursive: boolean) => Promise<void>;
  /** Revient à "Tous les dossiers" */
  clearActiveFolder: () => void;
  /** Toggle expand/collapse d'un noeud de l'arborescence */
  toggleFolderExpanded: (id: number) => void;
  /** Vérifie le statut des volumes (en ligne/hors ligne) */
  checkVolumeStatus: () => Promise<void>;
}

export const useFolderStore = create<FolderStore>((set) => ({
  // État initial
  folderTree: [],
  activeFolderId: null,
  activeFolderImageIds: null,
  expandedFolderIds: new Set(),
  isLoading: false,
  error: null,

  loadFolderTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const tree = await CatalogService.getFolderTree();
      set({ folderTree: tree, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement de l'arborescence";
      set({ error: message, isLoading: false });
    }
  },

  setActiveFolder: async (id: number, recursive: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const images = await CatalogService.getFolderImages(id, recursive);
      const imageIds = images.map((img) => img.id);
      set({
        activeFolderId: id,
        activeFolderImageIds: imageIds,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des images du dossier';
      set({ error: message, isLoading: false });
    }
  },

  clearActiveFolder: () => {
    set({
      activeFolderId: null,
      activeFolderImageIds: null,
    });
  },

  toggleFolderExpanded: (id: number) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedFolderIds);
      if (newExpandedIds.has(id)) {
        newExpandedIds.delete(id);
      } else {
        newExpandedIds.add(id);
      }
      return { expandedFolderIds: newExpandedIds };
    });
  },

  checkVolumeStatus: async () => {
    // Cette méthode sera implémentée plus tard avec le file watcher
    // Pour l'instant, elle ne fait rien mais conserve l'interface
    if (import.meta.env.DEV) {
      console.warn('Volume status check not yet implemented');
    }
  },
}));

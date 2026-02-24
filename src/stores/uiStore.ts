import { create } from 'zustand';
import type { ActiveView } from '../types';

interface UiStore {
  // État
  activeView: ActiveView;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  thumbnailSize: number;
  rightSidebarTab: 'develop' | 'metadata' | 'history';
  showImport: boolean;
  showBeforeAfter: boolean;
  selection: Set<number>; // ← Moved from catalogStore (UI state only)
  filterText: string; // ← Moved from catalogStore (UI state only)

  // Actions
  setActiveView: (view: ActiveView) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setThumbnailSize: (size: number) => void;
  setRightSidebarTab: (tab: 'develop' | 'metadata' | 'history') => void;
  setShowImport: (show: boolean) => void;
  toggleBeforeAfter: () => void;
  toggleSelection: (id: number, isMultiSelect?: boolean) => void; // ← Moved from catalogStore
  setSingleSelection: (id: number) => void; // ← Moved from catalogStore
  clearSelection: () => void; // ← Moved from catalogStore
  setFilterText: (text: string) => void; // ← Moved from catalogStore
}

export const useUiStore = create<UiStore>((set) => ({
  // État initial
  activeView: 'library',
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  thumbnailSize: 5,
  rightSidebarTab: 'develop',
  showImport: false,
  showBeforeAfter: false,
  selection: new Set(),
  filterText: '',

  // Actions
  setActiveView: (view: ActiveView) => set({ activeView: view }),

  toggleLeftSidebar: () =>
    set((state) => ({
      leftSidebarOpen: !state.leftSidebarOpen,
    })),

  toggleRightSidebar: () =>
    set((state) => ({
      rightSidebarOpen: !state.rightSidebarOpen,
    })),

  setThumbnailSize: (size: number) => set({ thumbnailSize: Math.max(1, Math.min(10, size)) }),

  setRightSidebarTab: (tab: 'develop' | 'metadata' | 'history') => set({ rightSidebarTab: tab }),

  setShowImport: (show: boolean) => set({ showImport: show }),

  toggleBeforeAfter: () =>
    set((state) => ({
      showBeforeAfter: !state.showBeforeAfter,
    })),

  // Selection management (moved from catalogStore)
  toggleSelection: (id: number, isMultiSelect = false) =>
    set((state) => {
      if (!isMultiSelect) {
        return { selection: new Set([id]) };
      }
      const newSelection = new Set(state.selection);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selection: newSelection };
    }),

  setSingleSelection: (id: number) => set({ selection: new Set([id]) }),

  clearSelection: () => set({ selection: new Set() }),

  // Filter management (moved from catalogStore)
  setFilterText: (text: string) => set({ filterText: text }),
}));

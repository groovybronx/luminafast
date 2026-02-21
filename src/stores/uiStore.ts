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

  // Actions
  setActiveView: (view: ActiveView) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setThumbnailSize: (size: number) => void;
  setRightSidebarTab: (tab: 'develop' | 'metadata' | 'history') => void;
  setShowImport: (show: boolean) => void;
  toggleBeforeAfter: () => void;
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
}));

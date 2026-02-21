import { create } from 'zustand';
import type { CatalogEvent } from '../types';

interface EditStore {
  // État
  eventLog: CatalogEvent[];
  currentEdits: Record<string, number>;
  historyIndex: number;

  // Actions
  addEvent: (event: CatalogEvent) => void;
  setCurrentEdits: (edits: Record<string, number>) => void;
  updateEdit: (param: string, value: number) => void;
  resetEdits: () => void;
  undo: () => void;
  redo: () => void;

  // Getters
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditStore = create<EditStore>((set, get) => ({
  // État initial
  eventLog: [],
  currentEdits: {},
  historyIndex: -1,

  // Actions
  addEvent: (event: CatalogEvent) =>
    set((state) => ({
      eventLog: [event, ...state.eventLog],
    })),

  setCurrentEdits: (edits: Record<string, number>) => set({ currentEdits: edits }),

  updateEdit: (param: string, value: number) =>
    set((state) => ({
      currentEdits: { ...state.currentEdits, [param]: value },
    })),

  resetEdits: () => set({ currentEdits: {} }),

  undo: () => {
    // TODO: Implémenter undo/redo quand on aura l'historique des edits
    console.warn('Undo not implemented yet');
  },

  redo: () => {
    // TODO: Implémenter undo/redo quand on aura l'historique des edits
    console.warn('Redo not implemented yet');
  },

  // Getters
  canUndo: () => get().historyIndex > 0,

  canRedo: () => get().historyIndex < get().eventLog.length - 1,
}));

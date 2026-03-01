import { create } from 'zustand';
import type { CatalogEvent } from '../types';
import type { EventDTO } from '@/services/eventService';

interface EditStore {
  // État
  eventLog: CatalogEvent[];
  currentEdits: Record<string, number>;
  historyIndex: number;
  editEventsPerImage: Record<number, EventDTO[]>; // Phase 4.2-B.2: Store events per image

  // Actions
  addEvent: (event: CatalogEvent) => void;
  setCurrentEdits: (edits: Record<string, number>) => void;
  updateEdit: (param: string, value: number) => void;
  resetEdits: () => void;
  undo: () => void;
  redo: () => void;
  setEditEventsForImage: (imageId: number, events: EventDTO[]) => void; // Phase 4.2-B.2
  clearEditEventsForImage: (imageId: number) => void; // Phase 4.2-B.2

  // Getters
  canUndo: () => boolean;
  canRedo: () => boolean;
  getAppliedEdits: (imageId: number) => EventDTO[]; // Phase 4.2-B.2 getter
}

export const useEditStore = create<EditStore>((set, get) => ({
  // État initial
  eventLog: [],
  currentEdits: {},
  historyIndex: -1,
  editEventsPerImage: {}, // Phase 4.2-B.2

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

  /**
   * Store edit events for a specific image (Phase 4.2-B.2)
   * Called by PreviewRenderer when loading events for an image
   */
  setEditEventsForImage: (imageId: number, events: EventDTO[]) =>
    set((state) => ({
      editEventsPerImage: {
        ...state.editEventsPerImage,
        [imageId]: events,
      },
    })),

  /**
   * Clear stored events for a specific image (Phase 4.2-B.2)
   * Called when component unmounts or image changes
   */
  clearEditEventsForImage: (imageId: number) =>
    set((state) => {
      const newEvents = { ...state.editEventsPerImage };
      delete newEvents[imageId];
      return { editEventsPerImage: newEvents };
    }),

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

  /**
   * Get applied edits for a specific image (Phase 4.2-B.2)
   * Returns stored Event Sourcing events for the image
   */
  getAppliedEdits: (imageId: number) => {
    return get().editEventsPerImage[imageId] ?? [];
  },
}));

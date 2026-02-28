import { create } from 'zustand';
import type { CatalogEvent } from '../types';
import type { EventDTO } from '@/services/eventService';
import type { PixelFilterState } from '@/types/rendering';
import { CatalogService } from '@/services/catalogService';
import { eventsToPixelFilters } from '@/services/renderingService';

interface EditStore {
  // État
  eventLog: CatalogEvent[];
  currentEdits: Record<string, number>;
  historyIndex: number;
  editEventsByImage: Record<number, EventDTO[]>;

  // Actions
  addEvent: (event: CatalogEvent) => void;
  setCurrentEdits: (edits: Record<string, number>) => void;
  updateEdit: (param: string, value: number) => void;
  resetEdits: () => void;
  undo: () => void;
  redo: () => void;
  loadEditEvents: (imageId: number) => Promise<void>;
  setEditEvents: (imageId: number, events: EventDTO[]) => void;

  // Getters
  canUndo: () => boolean;
  canRedo: () => boolean;
  getAppliedEdits: (imageId: number) => PixelFilterState;
}

export const useEditStore = create<EditStore>((set, get) => ({
  // État initial
  eventLog: [],
  currentEdits: {},
  historyIndex: -1,
  editEventsByImage: {},

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

  loadEditEvents: async (imageId: number) => {
    if (imageId <= 0) {
      return;
    }

    try {
      const events = await CatalogService.getEditEvents(imageId);
      set((state) => ({
        editEventsByImage: {
          ...state.editEventsByImage,
          [imageId]: events,
        },
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[editStore] Failed to load edit events:', error);
      }
      throw new Error(
        `Failed to load edit events for image ${imageId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  setEditEvents: (imageId: number, events: EventDTO[]) =>
    set((state) => ({
      editEventsByImage: {
        ...state.editEventsByImage,
        [imageId]: events,
      },
    })),

  // Getters
  canUndo: () => get().historyIndex > 0,

  canRedo: () => get().historyIndex < get().eventLog.length - 1,

  getAppliedEdits: (imageId: number) => {
    const events = get().editEventsByImage[imageId] ?? [];
    return eventsToPixelFilters(events);
  },
}));

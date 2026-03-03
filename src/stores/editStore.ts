import { create } from 'zustand';
import type { CatalogEvent } from '../types';
import type { EventDTO } from '@/services/eventService';
import type { SnapshotDTO } from '@/services/snapshotService';

interface EditStore {
  eventLog: CatalogEvent[];
  currentEdits: Record<string, number>;
  historyIndex: number;
  editEventsPerImage: Record<number, EventDTO[]>;
  snapshots: Record<number, SnapshotDTO[]>;

  addEvent: (event: CatalogEvent) => void;
  setCurrentEdits: (edits: Record<string, number>) => void;
  updateEdit: (param: string, value: number) => void;
  resetEdits: () => void;
  undo: () => void;
  redo: () => void;
  setEditEventsForImage: (imageId: number, events: EventDTO[]) => void;
  clearEditEventsForImage: (imageId: number) => void;
  restoreToEvent: (imageId: number, eventIndex: number) => void;
  setSnapshots: (imageId: number, snapshots: SnapshotDTO[]) => void;
  addSnapshot: (imageId: number, snapshot: SnapshotDTO) => void;
  deleteSnapshotLocal: (imageId: number, snapshotId: number) => void;

  canUndo: () => boolean;
  canRedo: () => boolean;
  getAppliedEdits: (imageId: number) => EventDTO[];
  getSnapshots: (imageId: number) => SnapshotDTO[];
  getSnapshot: (imageId: number, snapshotId: number) => SnapshotDTO | undefined;
}

export const useEditStore = create<EditStore>((set, get) => ({
  eventLog: [],
  currentEdits: {},
  historyIndex: -1,
  editEventsPerImage: {},
  snapshots: {},

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

  setEditEventsForImage: (imageId: number, events: EventDTO[]) =>
    set((state) => ({
      editEventsPerImage: {
        ...state.editEventsPerImage,
        [imageId]: events,
      },
    })),

  clearEditEventsForImage: (imageId: number) =>
    set((state) => {
      const newEvents = { ...state.editEventsPerImage };
      delete newEvents[imageId];
      return { editEventsPerImage: newEvents };
    }),

  restoreToEvent: (imageId: number, eventIndex: number) =>
    set((state) => {
      const events = state.editEventsPerImage[imageId] ?? [];
      if (eventIndex < 0 || eventIndex >= events.length) {
        return state;
      }

      const restoredEvents = events.slice(0, eventIndex + 1);
      return {
        editEventsPerImage: {
          ...state.editEventsPerImage,
          [imageId]: restoredEvents,
        },
      };
    }),

  setSnapshots: (imageId: number, snapshots: SnapshotDTO[]) =>
    set((state) => ({
      snapshots: {
        ...state.snapshots,
        [imageId]: snapshots,
      },
    })),

  addSnapshot: (imageId: number, snapshot: SnapshotDTO) =>
    set((state) => ({
      snapshots: {
        ...state.snapshots,
        [imageId]: [snapshot, ...(state.snapshots[imageId] ?? [])],
      },
    })),

  deleteSnapshotLocal: (imageId: number, snapshotId: number) =>
    set((state) => ({
      snapshots: {
        ...state.snapshots,
        [imageId]: (state.snapshots[imageId] ?? []).filter(
          (snapshot) => snapshot.id !== snapshotId,
        ),
      },
    })),

  undo: () => {
    console.warn('Undo not implemented yet');
  },

  redo: () => {
    console.warn('Redo not implemented yet');
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().eventLog.length - 1,

  getAppliedEdits: (imageId: number) => {
    return get().editEventsPerImage[imageId] ?? [];
  },

  getSnapshots: (imageId: number) => {
    return get().snapshots[imageId] ?? [];
  },

  getSnapshot: (imageId: number, snapshotId: number) => {
    return (get().snapshots[imageId] ?? []).find((snapshot) => snapshot.id === snapshotId);
  },
}));

import { create } from 'zustand';
import * as editService from '@/services/editService';
import type { EditPayload } from '@/types/edit';
import type { CatalogEvent } from '@/types';

/** Déduit le type d'événement Tauri depuis le nom du paramètre d'édition */
function inferEventType(param: string): string {
  const map: Record<string, string> = {
    exposure: 'EXPOSURE',
    contrast: 'CONTRAST',
    saturation: 'SATURATION',
    highlights: 'HIGHLIGHTS',
    shadows: 'SHADOWS',
    whites: 'WHITES',
    blacks: 'BLACKS',
    clarity: 'CLARITY',
    vibrance: 'VIBRANCE',
    temperature: 'TEMPERATURE',
    tint: 'TINT',
    sharpness: 'SHARPNESS',
    noise_reduction: 'NOISE_REDUCTION',
    crop: 'CROP',
    rotation: 'ROTATION',
  };
  return map[param.toLowerCase()] ?? param.toUpperCase();
}

interface EditStore {
  // ─── État ────────────────────────────────────────────────────────────────
  /** ID de l'image sélectionnée dans le panneau Develop */
  selectedImageId: number | null;
  /**
   * Journal local d'événements utilisateur (RATING, ADD_TAG, etc.) pour le panneau History.
   * Phase 4.3 connectera ceci au backend `get_edit_history`.
   */
  eventLog: CatalogEvent[];
  /** État courant des paramètres d'édition (source: backend replay) */
  currentEdits: Record<string, number>;
  /** Peut annuler le dernier edit (au moins un event actif en DB) */
  canUndo: boolean;
  /** Peut refaire un edit annulé (au moins un event undone en DB) */
  canRedo: boolean;
  /** Nombre d'events actifs (non-undone) en DB */
  eventCount: number;
  /** Chargement en cours (appel backend) */
  isLoading: boolean;
  /** Dernière erreur backend */
  error: string | null;

  // ─── Actions ─────────────────────────────────────────────────────────────

  /** Définit l'image courante dans le panneau Develop */
  setSelectedImageId: (imageId: number | null) => void;

  /**
   * Charge l'état d'édition depuis le backend et met à jour le store.
   * À appeler quand on navigue sur une image dans le panneau Develop.
   */
  loadEditState: (imageId: number) => Promise<void>;

  /**
   * Applique un paramètre d'édition via le backend (persiste en DB).
   * Met à jour `currentEdits` avec le nouvel état retourné.
   */
  applyEdit: (param: string, value: number, eventType?: string) => Promise<void>;

  /**
   * Mise à jour locale immédiate du store (pour preview UI pendant le drag d'un slider).
   * Ne persiste PAS en DB — appeler `applyEdit` à la fin du drag.
   */
  updateEdit: (param: string, value: number) => void;

  /**
   * Annule le dernier événement d'édition via le backend (soft-undo).
   * Met à jour `currentEdits` avec l'état après annulation.
   */
  undo: () => Promise<void>;

  /**
   * Refait un événement précédemment annulé.
   * @param eventId - ID de l'événement à refaire (obtenu via getEditHistory)
   */
  redo: (eventId: number) => Promise<void>;

  /**
   * Supprime tous les événements d'édition de l'image courante (reset complet).
   */
  resetEdits: () => Promise<void>;

  /**
   * Ajoute un événement au journal local (pour le panneau History).
   * Note: Phase 4.3 remplacera ceci par get_edit_history depuis le backend.
   */
  addEvent: (event: CatalogEvent) => void;
}

export const useEditStore = create<EditStore>((set, get) => ({
  // ─── État initial ─────────────────────────────────────────────────────────
  selectedImageId: null,
  currentEdits: {},
  canUndo: false,
  canRedo: false,
  eventCount: 0,
  isLoading: false,
  error: null,
  eventLog: [],

  // ─── Actions ─────────────────────────────────────────────────────────────

  setSelectedImageId: (imageId) => set({ selectedImageId: imageId }),

  loadEditState: async (imageId) => {
    set({ isLoading: true, error: null });
    try {
      const dto = await editService.getCurrentEditState(imageId);
      set({
        selectedImageId: imageId,
        currentEdits: dto.state,
        canUndo: dto.can_undo,
        canRedo: dto.can_redo,
        eventCount: dto.event_count,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isLoading: false });
    }
  },

  applyEdit: async (param, value, eventType) => {
    const { selectedImageId } = get();
    if (selectedImageId === null) return;

    const resolvedEventType = eventType ?? inferEventType(param);
    const payload: EditPayload = { param, value };

    set({ isLoading: true, error: null });
    try {
      const dto = await editService.applyEdit(selectedImageId, resolvedEventType, payload);
      set({
        currentEdits: dto.state,
        canUndo: dto.can_undo,
        canRedo: dto.can_redo,
        eventCount: dto.event_count,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isLoading: false });
    }
  },

  updateEdit: (param, value) =>
    set((state) => ({
      currentEdits: { ...state.currentEdits, [param]: value },
    })),

  undo: async () => {
    const { selectedImageId } = get();
    if (selectedImageId === null) return;

    set({ isLoading: true, error: null });
    try {
      const dto = await editService.undoEdit(selectedImageId);
      set({
        currentEdits: dto.state,
        canUndo: dto.can_undo,
        canRedo: dto.can_redo,
        eventCount: dto.event_count,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isLoading: false });
    }
  },

  redo: async (eventId) => {
    const { selectedImageId } = get();
    if (selectedImageId === null) return;

    set({ isLoading: true, error: null });
    try {
      const dto = await editService.redoEdit(selectedImageId, eventId);
      set({
        currentEdits: dto.state,
        canUndo: dto.can_undo,
        canRedo: dto.can_redo,
        eventCount: dto.event_count,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isLoading: false });
    }
  },

  resetEdits: async () => {
    const { selectedImageId } = get();
    if (selectedImageId === null) return;

    set({ isLoading: true, error: null });
    try {
      await editService.resetEdits(selectedImageId);
      set({
        currentEdits: {},
        canUndo: false,
        canRedo: false,
        eventCount: 0,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isLoading: false });
    }
  },

  // Journal local d'événements utilisateur — Phase 4.3 connectera au backend
  addEvent: (event) =>
    set((state) => ({
      eventLog: [event, ...state.eventLog],
    })),
}));

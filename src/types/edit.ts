/**
 * Types pour le module d'édition non-destructive (Phase 4.1 — Event Sourcing Engine)
 */

// Liste exhaustive des types d'événements d'édition supportés
export const EDIT_EVENT_TYPES = [
  'EXPOSURE',
  'CONTRAST',
  'SATURATION',
  'HIGHLIGHTS',
  'SHADOWS',
  'WHITES',
  'BLACKS',
  'CLARITY',
  'VIBRANCE',
  'TEMPERATURE',
  'TINT',
  'SHARPNESS',
  'NOISE_REDUCTION',
  'CROP',
  'ROTATION',
] as const;

export type EditEventType = (typeof EDIT_EVENT_TYPES)[number];

/** Payload JSON d'un événement d'édition */
export interface EditPayload {
  param: string;
  value: number;
  prev_value?: number;
}

/** DTO d'un événement d'édition (retourné par get_edit_history) */
export interface EditEventDTO {
  id: number;
  event_type: EditEventType;
  payload: EditPayload;
  is_undone: boolean;
  created_at: string;
}

/**
 * DTO de l'état courant d'édition d'une image.
 * `state` est un dictionnaire parametre/valeur reconstruit par rejeu des events.
 */
export interface EditStateDTO {
  image_id: number;
  state: Record<string, number>;
  can_undo: boolean;
  can_redo: boolean;
  event_count: number;
}

/** DTO d'un snapshot nommé (Phase 4.3) */
export interface SnapshotDTO {
  id: number;
  image_id: number;
  name: string;
  description?: string;
  event_count: number;
  created_at: string;
}

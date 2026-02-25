import { invoke } from '@tauri-apps/api/core';
import type { EditEventDTO, EditPayload, EditStateDTO } from '@/types/edit';

/**
 * Service editService — wrappeurs invoke() pour les commandes Tauri d'édition.
 *
 * Convention de nommage (Tauri v2) :
 * - Frontend : camelCase  → imageId, eventType, payloadJson
 * - Rust     : snake_case → image_id, event_type, payload_json
 * Tauri v2 convertit automatiquement camelCase → snake_case.
 */

/**
 * Applique un événement d'édition à une image.
 * Insère l'event en DB et retourne l'état courant reconstruit.
 */
export async function applyEdit(
  imageId: number,
  eventType: string,
  payload: EditPayload,
): Promise<EditStateDTO> {
  const payloadJson = JSON.stringify(payload);
  return invoke<EditStateDTO>('apply_edit', { imageId, eventType, payloadJson });
}

/**
 * Retourne les 50 derniers événements d'édition d'une image
 * (actifs + undone, pour afficher l'historique).
 */
export async function getEditHistory(imageId: number): Promise<EditEventDTO[]> {
  return invoke<EditEventDTO[]>('get_edit_history', { imageId });
}

/**
 * Retourne l'état courant d'édition d'une image.
 * Utilise le snapshot si disponible, sinon rejoue tous les events.
 */
export async function getCurrentEditState(imageId: number): Promise<EditStateDTO> {
  return invoke<EditStateDTO>('get_current_edit_state', { imageId });
}

/**
 * Annule le dernier événement d'édition (soft-undo).
 * Retourne le nouvel état après annulation.
 */
export async function undoEdit(imageId: number): Promise<EditStateDTO> {
  return invoke<EditStateDTO>('undo_edit', { imageId });
}

/**
 * Refait un événement précédemment annulé.
 *
 * @param imageId  - ID de l'image
 * @param eventId  - ID de l'événement à refaire (obtenu de getEditHistory)
 */
export async function redoEdit(imageId: number, eventId: number): Promise<EditStateDTO> {
  return invoke<EditStateDTO>('redo_edit', { imageId, eventId });
}

/**
 * Supprime TOUS les événements d'édition d'une image (reset complet).
 */
export async function resetEdits(imageId: number): Promise<void> {
  return invoke<void>('reset_edits', { imageId });
}

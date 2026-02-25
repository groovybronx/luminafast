import { invoke } from '@tauri-apps/api/core';
import type { EditEventDTO, SnapshotDTO, EditStateDTO } from '@/types/edit';

/**
 * Service wrapper pour les commandes Tauri de gestion d'historique (Phase 4.3).
 * Expose les 7 commandes history avec cache LRU et gestion d'erreurs.
 */

// Simple LRU cache for event timelines
const timelineCache = new Map<number, { events: EditEventDTO[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 100;

/**
 * Récupère la timeline des événements d'édition pour une image.
 * Utilise un cache LRU pour éviter les requêtes répétées.
 */
export async function getEventTimeline(
  imageId: number,
  limit = 50,
  forceRefresh = false,
): Promise<EditEventDTO[]> {
  // Check cache
  if (!forceRefresh && timelineCache.has(imageId)) {
    const cached = timelineCache.get(imageId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.events;
    }
  }

  try {
    const events = await invoke<EditEventDTO[]>('get_event_timeline', {
      imageId,
      limit,
    });

    // Update cache with LRU eviction
    if (timelineCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = timelineCache.keys().next().value as number | undefined;
      if (firstKey !== undefined) {
        timelineCache.delete(firstKey);
      }
    }
    timelineCache.set(imageId, { events, timestamp: Date.now() });

    return events;
  } catch (error) {
    console.error('[historyService] getEventTimeline failed:', error);
    throw new Error(
      `Failed to load event timeline: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Crée un snapshot nommé de l'état actuel.
 */
export async function createSnapshot(
  imageId: number,
  name: string,
  description?: string,
): Promise<SnapshotDTO> {
  try {
    const snapshot = await invoke<SnapshotDTO>('create_snapshot', {
      imageId,
      name,
      description,
    });

    // Invalidate cache
    timelineCache.delete(imageId);

    return snapshot;
  } catch (error) {
    console.error('[historyService] createSnapshot failed:', error);
    throw new Error(
      `Failed to create snapshot: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Retourne tous les snapshots d'une image.
 */
export async function getSnapshots(imageId: number): Promise<SnapshotDTO[]> {
  try {
    const snapshots = await invoke<SnapshotDTO[]>('get_snapshots', {
      imageId,
    });
    return snapshots;
  } catch (error) {
    console.error('[historyService] getSnapshots failed:', error);
    throw new Error(
      `Failed to load snapshots: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Restaure l'état à un événement spécifique (marque les événements suivants comme undone).
 */
export async function restoreToEvent(imageId: number, eventId: number): Promise<EditStateDTO> {
  try {
    const state = await invoke<EditStateDTO>('restore_to_event', {
      imageId,
      eventId,
    });

    // Invalidate cache
    timelineCache.delete(imageId);

    return state;
  } catch (error) {
    console.error('[historyService] restoreToEvent failed:', error);
    throw new Error(
      `Failed to restore to event: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Restaure l'état à un snapshot nommé.
 */
export async function restoreToSnapshot(snapshotId: number): Promise<EditStateDTO> {
  try {
    return await invoke<EditStateDTO>('restore_to_snapshot', {
      snapshotId,
    });
  } catch (error) {
    console.error('[historyService] restoreToSnapshot failed:', error);
    throw new Error(
      `Failed to restore to snapshot: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Supprime un snapshot.
 */
export async function deleteSnapshot(snapshotId: number): Promise<void> {
  try {
    await invoke('delete_snapshot', {
      snapshotId,
    });
  } catch (error) {
    console.error('[historyService] deleteSnapshot failed:', error);
    throw new Error(
      `Failed to delete snapshot: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Compte les événements actifs (non-undone) depuis l'import.
 */
export async function countEventsSinceImport(imageId: number): Promise<number> {
  try {
    return await invoke<number>('count_events_since_import', {
      imageId,
    });
  } catch (error) {
    console.error('[historyService] countEventsSinceImport failed:', error);
    throw new Error(
      `Failed to count events: ${error instanceof Error ? error.message : String(error)},`,
    );
  }
}

/**
 * Invalidate cache for an image (called after edits).
 */
export function invalidateCache(imageId: number): void {
  timelineCache.delete(imageId);
}

/**
 * Clear entire cache (called on app reset).
 */
export function clearCache(): void {
  timelineCache.clear();
}

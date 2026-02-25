import { invoke } from '@tauri-apps/api/core';

/**
 * TypeScript DTO matching Rust EventDTO
 * @see src-tauri/src/commands/event_sourcing.rs:EventDTO
 */
export interface EventDTO {
  id: string;
  timestamp: number;
  eventType: string; // Stored as string in DB (e.g., "ImageAdded", "RatingChanged")
  payload: Record<string, unknown>;
  targetType: string; // Stored as string in DB (e.g., "Image", "Collection")
  targetId: number;
  userId?: string;
  createdAt: string; // RFC3339 format
}

/**
 * Service for Event Sourcing operations
 * Provides audit trail and event history for all catalog modifications
 *
 * @example
 * // Append a new event
 * const event: EventDTO = {
 *   id: crypto.randomUUID(),
 *   timestamp: Date.now(),
 *   eventType: "RatingChanged",
 *   payload: { imageId: 123, oldRating: 3, newRating: 4 },
 *   targetType: "Image",
 *   targetId: 123,
 *   createdAt: new Date().toISOString(),
 * };
 * await appendEvent(event);
 *
 * // Retrieve all events
 * const events = await getEvents();
 * console.log(`Retrieved ${events.length} events`);
 *
 * // Replay events (idempotent)
 * await replayEvents();
 */

/**
 * Appends a new event to the event sourcing store
 * @param event - The event to append
 * @throws Error if the Tauri command fails
 * @returns Promise that resolves when the event is persisted
 */
export async function appendEvent(event: EventDTO): Promise<void> {
  try {
    return await invoke<void>('append_event', {
      event,
    });
  } catch (error) {
    throw new Error(
      `Failed to append event: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Retrieves all events from the event sourcing store
 * Events are ordered by timestamp (ascending)
 * @throws Error if the Tauri command fails
 * @returns Promise that resolves with all persisted events
 */
export async function getEvents(): Promise<EventDTO[]> {
  try {
    return await invoke<EventDTO[]>('get_events');
  } catch (error) {
    throw new Error(
      `Failed to retrieve events: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Replays all events idempotently
 * This reconstructs the complete state from the event log
 * @throws Error if the Tauri command fails
 * @returns Promise that resolves when replay is complete
 */
export async function replayEvents(): Promise<void> {
  try {
    return await invoke<void>('replay_events');
  } catch (error) {
    throw new Error(
      `Failed to replay events: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

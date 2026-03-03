import { invoke } from '@tauri-apps/api/core';

/**
 * TypeScript DTO matching Rust SnapshotDTO
 * @see src-tauri/src/models/snapshot.rs:SnapshotDTO
 */
export interface SnapshotDTO {
  id: number;
  imageId: number;
  name: string;
  snapshotData: string; // JSON serialized events
  eventIds: string[];
  createdAt: string; // RFC3339 format
}

/**
 * Service for Snapshot operations
 * Provides time-travel and state management for edit history
 *
 * @example
 * // Create a new snapshot
 * const snapshot = await createSnapshot(
 *   imageId,
 *   "Before color grading",
 *   ["evt-1", "evt-2"],
 *   JSON.stringify(events)
 * );
 *
 * // Get all snapshots for an image
 * const snapshots = await getSnapshots(imageId);
 *
 * // Delete a snapshot
 * await deleteSnapshot(snapshotId);
 */

/**
 * Create a new snapshot for an image
 * @param imageId - ID of the image being edited
 * @param name - User-provided name for the snapshot
 * @param eventIds - Vector of event IDs that comprise this snapshot
 * @param snapshotData - JSON string containing serialized events
 * @returns Promise resolving to the created SnapshotDTO
 * @throws Error if creation fails (empty name, duplicate name, DB error)
 */
export async function createSnapshot(
  imageId: number,
  name: string,
  eventIds: string[],
  snapshotData: string,
): Promise<SnapshotDTO> {
  try {
    return await invoke<SnapshotDTO>('create_snapshot', {
      imageId,
      name,
      eventIds,
      snapshotData,
    });
  } catch (error) {
    throw new Error(`Failed to create snapshot: ${error}`);
  }
}

/**
 * Get all snapshots for a specific image
 * @param imageId - ID of the image
 * @returns Promise resolving to array of SnapshotDTOs (ordered newest first)
 * @throws Error if query fails
 */
export async function getSnapshots(imageId: number): Promise<SnapshotDTO[]> {
  try {
    return await invoke<SnapshotDTO[]>('get_snapshots', { imageId });
  } catch (error) {
    throw new Error(`Failed to get snapshots: ${error}`);
  }
}

/**
 * Get a single snapshot by ID
 * @param snapshotId - ID of the snapshot
 * @returns Promise resolving to SnapshotDTO or null if not found
 * @throws Error if query fails
 */
export async function getSnapshot(snapshotId: number): Promise<SnapshotDTO | null> {
  try {
    return await invoke<SnapshotDTO | null>('get_snapshot', { snapshotId });
  } catch (error) {
    throw new Error(`Failed to get snapshot: ${error}`);
  }
}

/**
 * Delete a snapshot by ID
 * @param snapshotId - ID of the snapshot to delete
 * @returns Promise that resolves when deleted
 * @throws Error if deletion fails (not found, DB error)
 */
export async function deleteSnapshot(snapshotId: number): Promise<void> {
  try {
    await invoke<void>('delete_snapshot', { snapshotId });
  } catch (error) {
    throw new Error(`Failed to delete snapshot: ${error}`);
  }
}

/**
 * Rename an existing snapshot
 * @param snapshotId - ID of the snapshot to rename
 * @param newName - New name for the snapshot
 * @returns Promise that resolves when renamed
 * @throws Error if rename fails (empty name, not found, DB error)
 */
export async function renameSnapshot(snapshotId: number, newName: string): Promise<void> {
  try {
    await invoke<void>('rename_snapshot', { snapshotId, newName });
  } catch (error) {
    throw new Error(`Failed to rename snapshot: ${error}`);
  }
}

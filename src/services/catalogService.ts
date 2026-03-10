import type { CollectionDTO, ImageDTO, ImageDetailDTO, ImageFilter } from '../types/dto';
import type { FolderTreeNode } from '../types/folder';
import type { EventDTO } from './eventService';
import { appendEvent as appendEventToStore } from './eventService';

/**
 * Service for catalog operations - Phase 1.2
 * Wraps Tauri commands for frontend-backend communication
 */
export class CatalogService {
  /**
   * Get Tauri invoke function (handle both __TAURI__ and __TAURI_INTERNALS__)
   */
  private static getInvoke() {
    if (typeof window !== 'undefined') {
      // Try __TAURI__ first (normal case)
      const tauriWindow = window as unknown as {
        __TAURI__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
        __TAURI_INTERNALS__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      };

      if (tauriWindow.__TAURI__?.invoke) {
        return tauriWindow.__TAURI__.invoke;
      }
      // Fallback to __TAURI_INTERNALS__ (brownfield pattern)
      if (tauriWindow.__TAURI_INTERNALS__?.invoke) {
        return tauriWindow.__TAURI_INTERNALS__.invoke;
      }
    }
    throw new Error('Tauri API not available');
  }

  /**
   * Get all images with optional filtering
   */
  static async getAllImages(filter?: ImageFilter, includeExif = false): Promise<ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_all_images', { filter, includeExif });

      if (typeof result === 'string') {
        throw new Error(result);
      }

      return result as ImageDTO[];
    } catch (error) {
      console.error('Failed to get all images:', error);
      throw error;
    }
  }

  /**
   * Get detailed information for a single image
   */
  static async getImageDetail(id: number): Promise<ImageDetailDTO> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_image_detail', { id });

      if (typeof result === 'string') {
        throw new Error(result);
      }

      return result as ImageDetailDTO;
    } catch (error) {
      console.error(`Failed to get image detail for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get full EXIF metadata for a single image (Phase 5.1)
   * Includes GPS and color_space not available in ImageDTO.
   */
  static async getImageExif(id: number): Promise<import('../types/dto').ExifMetadataDTO> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_image_exif', { id });

      if (typeof result === 'string') {
        throw new Error(result);
      }

      return result as import('../types/dto').ExifMetadataDTO;
    } catch (error) {
      console.error(`Failed to get EXIF for image ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update image state (rating, flag, color_label) - Checkpoint 2
   * Now accepts an object for better API design
   */
  static async updateImageState(
    id: number,
    updates?: {
      rating?: number;
      flag?: 'pick' | 'reject' | null;
    },
  ): Promise<void> {
    try {
      const invoke = this.getInvoke();
      await invoke('update_image_state', {
        id,
        rating: updates?.rating,
        flag: updates?.flag,
      });
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Create a new collection
   */
  static async createCollection(
    name: string,
    collectionType: 'static' | 'smart' | 'quick',
    parentId?: number,
  ): Promise<CollectionDTO> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('create_collection', {
        name,
        collectionType,
        parentId,
      });
      return result as CollectionDTO;
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Add images to a collection
   */
  static async addImagesToCollection(collectionId: number, imageIds: number[]): Promise<void> {
    try {
      const invoke = this.getInvoke();
      if (import.meta.env.DEV) {
        console.warn('[CatalogService] addImagesToCollection:', {
          collectionId,
          imageIds,
        });
      }
      await invoke('add_images_to_collection', {
        collectionId,
        imageIds,
      });
      if (import.meta.env.DEV) {
        console.warn('[CatalogService] addImagesToCollection success');
      }
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Delete a collection and all its image associations
   */
  static async deleteCollection(id: number): Promise<void> {
    try {
      const invoke = this.getInvoke();
      await invoke('delete_collection', { collectionId: id });
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Rename an existing collection
   */
  static async renameCollection(id: number, name: string): Promise<void> {
    try {
      const invoke = this.getInvoke();
      await invoke('rename_collection', { collectionId: id, name });
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Remove specific images from a collection (does not delete images from catalogue)
   */
  static async removeImagesFromCollection(collectionId: number, imageIds: number[]): Promise<void> {
    try {
      const invoke = this.getInvoke();
      await invoke('remove_images_from_collection', {
        collectionId,
        imageIds,
      });
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get all images belonging to a specific collection
   */
  static async getCollectionImages(
    collectionId: number,
  ): Promise<import('../types/dto').ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_collection_images', { collectionId });
      return result as import('../types/dto').ImageDTO[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Create a new smart collection with a query
   * @param name - Collection name
   * @param smartQuery - JSON string with rules and combinator
   * @param parentId - Optional parent collection ID
   */
  static async createSmartCollection(
    name: string,
    smartQuery: string,
    parentId?: number,
  ): Promise<CollectionDTO> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('create_smart_collection', {
        name,
        smartQuery,
        parentId,
      });
      return result as CollectionDTO;
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get results for a smart collection's query
   * @param collectionId - ID of the smart collection
   */
  static async getSmartCollectionResults(
    collectionId: number,
  ): Promise<import('../types/dto').ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_smart_collection_results', { collectionId });
      return result as import('../types/dto').ImageDTO[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Update a smart collection's query
   * @param collectionId - ID of the smart collection
   * @param smartQuery - JSON string with rules and combinator
   */
  static async updateSmartCollection(collectionId: number, smartQuery: string): Promise<void> {
    try {
      const invoke = this.getInvoke();
      await invoke('update_smart_collection', { collectionId, smartQuery });
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get all collections
   */
  static async getCollections(): Promise<CollectionDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_collections');
      return result as CollectionDTO[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Search images by text query
   */
  static async searchImages(query: string, filters?: ImageFilter): Promise<ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('search_images', { query, filters });
      return result as ImageDTO[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get folder tree hierarchy with image counts
   */
  static async getFolderTree(): Promise<FolderTreeNode[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_folder_tree');
      return result as FolderTreeNode[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get images from a specific folder
   */
  static async getFolderImages(folderId: number, recursive: boolean): Promise<ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_folder_images', { folderId, recursive });
      return result as ImageDTO[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Update volume online status
   */
  static async updateVolumeStatus(volumeName: string, isOnline: boolean): Promise<void> {
    try {
      const invoke = this.getInvoke();
      await invoke('update_volume_status', { volumeName, isOnline });
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Get edit events for a specific image (Phase 4.2B.1)
   * Retrieves all Event Sourcing events that target this image
   */
  static async getEditEvents(imageId: number): Promise<EventDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_edit_events', { imageId }); // ← camelCase

      if (typeof result === 'string') {
        throw new Error(result);
      }

      if (typeof result === 'object' && result !== null && 'message' in result) {
        throw new Error((result as Record<string, unknown>).message as string);
      }

      /* if (import.meta.env.DEV) {
        console.warn(
          `[CatalogService] getEditEvents for imageId=${imageId}, returned ${Array.isArray(result) ? result.length : 0} events`,
        );
      } */

      return result as EventDTO[];
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Utility method to check if a result is an error
   */
  static isError<T>(result: T | string): result is string {
    return typeof result === 'string';
  }

  /**
   * Parse error from Tauri command
   */
  private static parseError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    return new Error('Unknown error occurred');
  }

  /**
   * Utility method to handle command results consistently
   */
  static handleResult<T>(result: T | string): T {
    if (this.isError(result)) {
      throw new Error(result);
    }
    return result;
  }

  /**
   * Append an event to the Event Sourcing store
   * Phase 4.2: Used to persist EDIT operations (exposure, contrast changes, etc.)
   * @param event - EventDTO to persist
   * @throws Error if append fails
   */
  static async appendEvent(event: EventDTO): Promise<void> {
    try {
      await appendEventToStore(event);
    } catch (error) {
      throw this.parseError(error);
    }
  }
}

import type { 
  ImageDTO, 
  ImageDetailDTO, 
  CollectionDTO, 
  ImageFilter 
} from '../types/dto';

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
      if ((window as any).__TAURI__?.invoke) {
        return (window as any).__TAURI__.invoke;
      }
      // Fallback to __TAURI_INTERNALS__ (brownfield pattern)
      if ((window as any).__TAURI_INTERNALS__?.invoke) {
        return (window as any).__TAURI_INTERNALS__.invoke;
      }
    }
    throw new Error('Tauri API not available');
  }
  
  /**
   * Get all images with optional filtering
   */
  static async getAllImages(filter?: ImageFilter): Promise<ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_all_images', { filter });
      
      if (typeof result === 'string') {
        throw new Error(result);
      }
      
      return result;
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
      
      return result;
    } catch (error) {
      console.error(`Failed to get image detail for ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update image state (rating, flag, color_label)
   */
  static async updateImageState(
    id: number, 
    rating?: number, 
    flag?: string
  ): Promise<void> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('update_image_state', { 
        id, 
        rating, 
        flag 
      });
      
      if (typeof result === 'string') {
        throw new Error(result);
      }
    } catch (error) {
      console.error(`Failed to update image state for ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new collection
   */
  static async createCollection(
    name: string,
    collectionType: 'static' | 'smart' | 'quick',
    parentId?: number
  ): Promise<CollectionDTO> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('create_collection', {
        name,
        collection_type: collectionType,
        parent_id: parentId
      });
      
      if (typeof result === 'string') {
        throw new Error(result);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }
  
  /**
   * Add images to a collection
   */
  static async addImagesToCollection(
    collectionId: number,
    imageIds: number[]
  ): Promise<void> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('add_images_to_collection', {
        collection_id: collectionId,
        image_ids: imageIds
      });
      
      if (typeof result === 'string') {
        throw new Error(result);
      }
    } catch (error) {
      console.error(`Failed to add images to collection ${collectionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all collections
   */
  static async getCollections(): Promise<CollectionDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('get_collections');
      
      if (typeof result === 'string') {
        throw new Error(result);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to get collections:', error);
      throw error;
    }
  }
  
  /**
   * Search images by text query
   */
  static async searchImages(query: string): Promise<ImageDTO[]> {
    try {
      const invoke = this.getInvoke();
      const result = await invoke('search_images', { query });
      
      if (typeof result === 'string') {
        throw new Error(result);
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to search images with query "${query}":`, error);
      throw error;
    }
  }
  
  /**
   * Utility method to check if a result is an error
   */
  static isError<T>(result: T | string): result is string {
    return typeof result === 'string';
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
}

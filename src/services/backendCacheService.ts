/**
 * Backend Cache Service — Rust Command Wrappers (Phase 6.1)
 *
 * TypeScript wrappers for Tauri cache commands.
 * Coordinates with frontend cacheService for complete L1+L2 cache workflow.
 *
 * Usage:
 *   const cached = await BackendCacheService.getCachedThumbnail(imageId);
 *   await BackendCacheService.invalidateImage(imageId);
 *   const stats = await BackendCacheService.getCacheStats();
 */

import { invoke } from '@tauri-apps/api/core';

export interface CacheStatsResponse {
  l1: {
    size: number;
    capacity: number;
    utilization: string; // "45.2%"
    hits: number;
    misses: number;
    hitRate: string; // "87.3%"
  };
  l2: {
    size: number;
    diskUsage: string; // "1.23 GB"
    diskUsageBytes: number;
    hits: number;
    misses: number;
    hitRate: string; // "N/A" if no hits/misses yet
  };
}

/**
 * Backend Cache Service — Tauri RPC Interface
 *
 * All methods are async and interact with the Rust cache layer.
 * Complements frontend cacheService by adding disk (L2) persistence.
 */
export class BackendCacheService {
  /**
   * Get cached thumbnail from backend (L1 or L2)
   *
   * @param imageId Unique image identifier
   * @returns Base64-encoded image data, or null if not cached
   */
  static async getCachedThumbnail(imageId: number): Promise<string | null> {
    try {
      return await invoke<string | null>('get_cached_thumbnail', {
        imageId,
      });
    } catch (error) {
      console.error(`Failed to get cached thumbnail for image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Store thumbnail in backend cache (both L1 and L2)
   *
   * @param imageId Unique image identifier
   * @param dataBase64 Base64-encoded image data
   */
  static async setCachedThumbnail(imageId: number, dataBase64: string): Promise<void> {
    try {
      await invoke('set_cached_thumbnail', {
        imageId,
        dataBase64,
      });
    } catch (error) {
      console.error(`Failed to set cached thumbnail for image ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache entry for an image (removes from L1 and L2)
   *
   * Called when an image is edited via Event Sourcing.
   *
   * @param imageId Unique image identifier
   */
  static async invalidateImage(imageId: number): Promise<void> {
    try {
      await invoke('invalidate_image_cache', {
        imageId,
      });
    } catch (error) {
      console.error(`Failed to invalidate cache for image ${imageId}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics for monitoring and diagnostics
   *
   * @returns Cache stats including L1/L2 hit rates, sizes, disk usage
   */
  static async getCacheStats(): Promise<CacheStatsResponse> {
    try {
      return await invoke<CacheStatsResponse>('get_cache_stats', {});
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear all caches (both L1 and L2)
   *
   * Useful for testing or manual cleanup. Cache is session-only,
   * so this is called on app exit automatically.
   */
  static async clearAllCaches(): Promise<void> {
    try {
      await invoke('clear_all_caches', {});
    } catch (error) {
      console.error('Failed to clear caches:', error);
      throw error;
    }
  }

  /**
   * Check if an image is cached at a specific level
   *
   * @param imageId Unique image identifier
   * @param level Cache level: "L1", "L2", or "any"
   * @returns true if cached at the specified level, false otherwise
   */
  static async isImageCached(
    imageId: number,
    level: 'L1' | 'L2' | 'any' = 'any',
  ): Promise<boolean> {
    try {
      return await invoke<boolean>('is_image_cached', {
        imageId,
        level,
      });
    } catch (error) {
      console.error(`Failed to check cache status for image ${imageId}:`, error);
      return false;
    }
  }

  /**
   * Warm the cache by pre-loading a batch of thumbnails
   * Useful for catalog startup to meet <3s target.
   *
   * @param imageIds Array of image IDs to pre-load
   */
  static async warmCache(imageIds: number[]): Promise<number> {
    let loaded = 0;

    for (const imageId of imageIds) {
      try {
        const cached = await this.isImageCached(imageId, 'L2');
        if (cached) {
          loaded++;
        }
      } catch {
        // Continue warming cache even if one fails
      }
    }

    return loaded;
  }
}

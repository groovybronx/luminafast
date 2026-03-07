/**
 * Cache Invalidation Service — L1 Multilevel Cache System (Phase 6.1)
 *
 * Centralized event bus for coordinating cache invalidation across all L1 caches.
 * - Listens to editStore changes
 * - Triggers invalidation for specific image or all caches
 * - Integrates with cacheService for cleanup
 * - Session-only (no persistence)
 *
 * Usage:
 *   editStore.updateEdit(imageId) → cacheInvalidationService.invalidateCacheForImage(imageId)
 */

import { cacheInstances } from './cacheService';

/**
 * Cache invalidation callback type
 */
export type InvalidationCallback = (imageId?: number) => void;

/**
 * Singleton cache invalidation service
 */
class CacheInvalidationService {
  private callbacks: InvalidationCallback[] = [];
  private isInitialized = false;

  /**
   * Initialize the service (called once on app startup)
   * Registers listeners on editStore to automatically invalidate caches on edit changes
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Note: Invalidation is triggered manually from editStore.updateEdit()
    // and from components that modify cache state.
    // This is simpler than Zustand middleware for now.

    this.isInitialized = true;
  }

  /**
   * Register a callback to be called when cache is invalidated
   * Useful for components that need custom cleanup logic
   */
  onInvalidate(callback: InvalidationCallback): () => void {
    this.callbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Invalidate cache for a specific image
   * - Clear thumbnail cache entry
   * - Clear event replay cache (editDerivedStore would handle this)
   * - Clear filter normalization cache
   * - Notify all subscribers
   *
   * @param imageId The image ID to invalidate
   */
  invalidateCacheForImage(imageId: number): void {
    // Delete from thumbnail cache
    cacheInstances.thumbnails.delete(imageId);

    // Delete from preview metadata cache
    const metaKey = `preview_meta_${imageId}`;
    cacheInstances.previewMetadata.delete(metaKey);

    // Notify subscribers
    this.callbacks.forEach((cb) => cb(imageId));

    // Log in development mode
    if (import.meta.env.DEV) {
      console.warn(`[CacheInvalidation] Image ${imageId} invalidated`);
    }
  }

  /**
   * Invalidate all L1 caches
   * Called after batch operations (import, collection changes, etc.)
   */
  invalidateAllCaches(): void {
    // Clear all predefined cache instances
    cacheInstances.thumbnails.clear();
    cacheInstances.previewMetadata.clear();
    cacheInstances.queryResults.clear();

    // Notify subscribers
    this.callbacks.forEach((cb) => cb());

    if (import.meta.env.DEV) {
      console.warn('[CacheInvalidation] All caches invalidated');
    }
  }

  /**
   * Invalidate catalog query results
   * Called after import/collection changes
   */
  invalidateQueryResults(): void {
    cacheInstances.queryResults.clear();

    if (import.meta.env.DEV) {
      console.warn('[CacheInvalidation] Query results cache cleared');
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    thumbnails: { size: number; maxSize: number } | undefined;
    previewMetadata: { size: number; maxSize: number } | undefined;
    queryResults: { size: number; maxSize: number } | undefined;
  } {
    // Cast to LRUCache to access getStats method
    // This is safe because cacheInstances always uses createLRUCache
    type StatCache = { getStats: () => { size: number; maxSize: number } };
    const getThumbnailStats = (cacheInstances.thumbnails as unknown as StatCache).getStats?.();
    const getMetadataStats = (cacheInstances.previewMetadata as unknown as StatCache).getStats?.();
    const getQueryStats = (cacheInstances.queryResults as unknown as StatCache).getStats?.();

    return {
      thumbnails: getThumbnailStats,
      previewMetadata: getMetadataStats,
      queryResults: getQueryStats,
    };
  }
}

/**
 * Singleton instance
 */
export const cacheInvalidationService = new CacheInvalidationService();

/**
 * Initialize on module load (if in browser)
 */
if (typeof window !== 'undefined') {
  cacheInvalidationService.initialize();
}

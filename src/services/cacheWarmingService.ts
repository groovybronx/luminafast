/**
 * Cache Warming Service — Phase 6.1.4
 *
 * Implements intelligent cache warming on app startup.
 * Pre-loads thumbnails for frequently-accessed images to reduce latency.
 *
 * Strategy:
 * 1. On app startup, get list of all images
 * 2. Prime cache with first batch of thumbnails (sorted by recent/rated)
 * 3. Background-warm remaining images while app is idle
 */

import { BackendCacheService } from './backendCacheService';
import { CatalogService } from './catalogService';
import type { ImageDTO } from '../types/dto';

export interface CacheWarmingProgress {
  total: number;
  warmed: number;
  hitRate: string; // "87.3%"
  estimatedTimeMs: number;
}

export class CacheWarmingService {
  private static isWarming = false;
  private static warmingProgress: CacheWarmingProgress = {
    total: 0,
    warmed: 0,
    hitRate: '0%',
    estimatedTimeMs: 0,
  };

  /**
   * Start cache warming sequence
   * Called once on app initialization
   *
   * @param onProgress Optional callback to track warming progress
   */
  static async warmCache(onProgress?: (progress: CacheWarmingProgress) => void): Promise<void> {
    if (this.isWarming) {
      if (import.meta.env.DEV) {
        console.warn('[CacheWarming] Already warming cache, skipping...');
      }
      return;
    }

    this.isWarming = true;
    const startTime = performance.now();

    try {
      // 1. Get all images (filtered, recent/rated first)
      if (import.meta.env.DEV) {
        console.warn('[CacheWarming] Fetching image list...');
      }
      const allImages = await CatalogService.getAllImages();

      // Sort by: rating (desc) → imported_at (desc)
      // This prioritizes high-rated and recent images
      const sortedImages = allImages.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;

        const dateA = new Date(a.imported_at).getTime();
        const dateB = new Date(b.imported_at).getTime();
        return dateB - dateA;
      });

      this.warmingProgress.total = sortedImages.length;

      // 2. Batch warm: first N images immediately (target: <2s)
      const BATCH_SIZE = 50; // Images to warm in initial batch
      if (import.meta.env.DEV) {
        console.warn(`[CacheWarming] Warming ${BATCH_SIZE} of ${sortedImages.length} images...`);
      }

      let warmedCount = 0;
      const warmBatch = sortedImages.slice(0, Math.min(BATCH_SIZE, sortedImages.length));
      for (const currentImage of warmBatch) {
        try {
          // Attempt to load thumbnail from backend cache
          // This triggers cache population if not already cached
          await BackendCacheService.getCachedThumbnail(currentImage.id);
          warmedCount++;
          this.warmingProgress.warmed = warmedCount;

          if (onProgress) {
            onProgress({
              ...this.warmingProgress,
              estimatedTimeMs: performance.now() - startTime,
            });
          }
        } catch (error) {
          // Non-blocking: thumbnail load failure shouldn't stop warming
          if (import.meta.env.DEV) {
            console.warn(
              `[CacheWarming] Failed to warm image ${currentImage.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      // 3. Background warm: remaining images in idle time
      if (sortedImages.length > BATCH_SIZE) {
        this.warmeCacheInBackground(sortedImages.slice(BATCH_SIZE), startTime);
      }

      const elapsedMs = performance.now() - startTime;
      if (import.meta.env.DEV) {
        console.warn(
          `[CacheWarming] Initial batch complete: ${warmedCount}/${BATCH_SIZE} in ${elapsedMs.toFixed(0)}ms`,
        );
      }

      // Get final cache stats
      const stats = await BackendCacheService.getCacheStats();
      this.warmingProgress.hitRate = stats.l1.hitRate;
    } catch (error) {
      console.error('[CacheWarming] Fatal error during warming:', error);
      // Continue anyway - warming is non-blocking
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Background warming using requestIdleCallback for non-blocking load
   */
  private static async warmeCacheInBackground(
    images: ImageDTO[],
    startTime: number,
  ): Promise<void> {
    const remainingCount = images.length;
    if (import.meta.env.DEV) {
      console.warn(`[CacheWarming] Scheduling background warming for ${remainingCount} images...`);
    }

    // Use requestIdleCallback if available, fallback to setTimeout
    const scheduleInIdle = (callback: () => Promise<void>) => {
      if ('requestIdleCallback' in window) {
        const rid = window as unknown as {
          requestIdleCallback: (cb: IdleRequestCallback) => void;
        };
        rid.requestIdleCallback(() => {
          callback().catch((error) => {
            if (import.meta.env.DEV) {
              console.warn('[CacheWarming] Background error:', error);
            }
          });
        });
      } else {
        // Fallback: schedule after brief delay
        setTimeout(() => {
          callback().catch((error) => {
            if (import.meta.env.DEV) {
              console.warn('[CacheWarming] Background error:', error);
            }
          });
        }, 1000);
      }
    };

    // Warm remaining images in small batches
    const BACKGROUND_BATCH_SIZE = 10;
    for (let i = 0; i < images.length; i += BACKGROUND_BATCH_SIZE) {
      const batch = images.slice(i, Math.min(i + BACKGROUND_BATCH_SIZE, images.length));
      const batchNumber = Math.floor(i / BACKGROUND_BATCH_SIZE) + 1;

      scheduleInIdle(async () => {
        if (import.meta.env.DEV) {
          console.warn(
            `[CacheWarming] Background batch ${batchNumber} (${batch.length} images)...`,
          );
        }

        for (const image of batch) {
          try {
            await BackendCacheService.getCachedThumbnail(image.id);
            this.warmingProgress.warmed++;
          } catch (error) {
            // Silent: non-blocking background warming
            if (import.meta.env.DEV) {
              console.warn(`[CacheWarming] Batch warming skipped image ${image.id}:`, error);
            }
          }
        }

        const elapsedMs = performance.now() - startTime;
        if (import.meta.env.DEV) {
          console.warn(
            `[CacheWarming] Background batch ${batchNumber} done (total: ${
              this.warmingProgress.warmed
            }/${this.warmingProgress.total}, elapsed: ${(elapsedMs / 1000).toFixed(1)}s)`,
          );
        }
      });
    }
  }

  /**
   * Get current warming progress
   */
  static getProgress(): CacheWarmingProgress {
    return { ...this.warmingProgress };
  }

  /**
   * Check if currently warming
   */
  static isCurrentlyWarming(): boolean {
    return this.isWarming;
  }
}

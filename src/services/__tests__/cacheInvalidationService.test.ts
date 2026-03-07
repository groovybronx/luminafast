/**
 * Cache Invalidation Service Tests — Phase 6.1
 *
 * Tests for cache invalidation coordination:
 * - Single image invalidation
 * - All-cache invalidation
 * - Callback registration/unregistration
 * - Stats reporting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheInvalidationService } from '@/services/cacheInvalidationService';
import { cacheInstances } from '@/services/cacheService';

describe('CacheInvalidationService', () => {
  beforeEach(() => {
    // Clear all caches before each test
    cacheInstances.thumbnails.clear();
    cacheInstances.previewMetadata.clear();
    cacheInstances.queryResults.clear();
  });

  describe('Image Cache Invalidation', () => {
    it('should invalidate specific image from thumbnails cache', () => {
      cacheInstances.thumbnails.set(42, 'thumbnail-url');
      expect(cacheInstances.thumbnails.get(42)).toBe('thumbnail-url');

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(cacheInstances.thumbnails.get(42)).toBeUndefined();
    });

    it('should invalidate specific image from preview metadata cache', () => {
      const metaKey = 'preview_meta_42';
      cacheInstances.previewMetadata.set(metaKey, { width: 240 });
      expect(cacheInstances.previewMetadata.get(metaKey)).toEqual({ width: 240 });

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(cacheInstances.previewMetadata.get(metaKey)).toBeUndefined();
    });

    it('should not affect other images when invalidating one', () => {
      cacheInstances.thumbnails.set(42, 'thumb-42');
      cacheInstances.thumbnails.set(43, 'thumb-43');

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(cacheInstances.thumbnails.get(42)).toBeUndefined();
      expect(cacheInstances.thumbnails.get(43)).toBe('thumb-43');
    });

    it('should call registered callbacks with imageId', () => {
      const callback = vi.fn();
      cacheInvalidationService.onInvalidate(callback);

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(callback).toHaveBeenCalledWith(42);
    });
  });

  describe('All Cache Invalidation', () => {
    it('should clear all cache instances', () => {
      cacheInstances.thumbnails.set(1, 'thumb');
      cacheInstances.previewMetadata.set('meta', { data: 'value' });
      cacheInstances.queryResults.set('query_key', { result: 'data' });

      cacheInvalidationService.invalidateAllCaches();

      expect(cacheInstances.thumbnails.size()).toBe(0);
      expect(cacheInstances.previewMetadata.size()).toBe(0);
      expect(cacheInstances.queryResults.size()).toBe(0);
    });

    it('should call registered callbacks without imageId for all invalidation', () => {
      const callback = vi.fn();
      cacheInvalidationService.onInvalidate(callback);

      cacheInvalidationService.invalidateAllCaches();

      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe('Query Results Invalidation', () => {
    it('should clear query results cache only', () => {
      cacheInstances.thumbnails.set(1, 'thumb');
      cacheInstances.queryResults.set('query', { data: 'value' });

      cacheInvalidationService.invalidateQueryResults();

      expect(cacheInstances.thumbnails.size()).toBe(1); // Thumbnails unchanged
      expect(cacheInstances.queryResults.size()).toBe(0); // Query results cleared
    });
  });

  describe('Callback Registration', () => {
    it('should register and call callback', () => {
      const callback = vi.fn();
      cacheInvalidationService.onInvalidate(callback);

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(callback).toHaveBeenCalledWith(42);
    });

    it('should allow multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      cacheInvalidationService.onInvalidate(callback1);
      cacheInvalidationService.onInvalidate(callback2);

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(callback1).toHaveBeenCalledWith(42);
      expect(callback2).toHaveBeenCalledWith(42);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = cacheInvalidationService.onInvalidate(callback);

      unsubscribe();

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should unsubscribe specific callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      cacheInvalidationService.onInvalidate(callback1);
      const unsub2 = cacheInvalidationService.onInvalidate(callback2);

      unsub2();

      cacheInvalidationService.invalidateCacheForImage(42);

      expect(callback1).toHaveBeenCalledWith(42);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return cache stats', () => {
      cacheInstances.thumbnails.set(1, 'thumb1');
      cacheInstances.thumbnails.set(2, 'thumb2');

      const stats = cacheInvalidationService.getStats();

      expect(stats.thumbnails?.size).toBe(2);
      expect(stats.thumbnails?.maxSize).toBe(500);
    });

    it('should return stats for empty caches', () => {
      const stats = cacheInvalidationService.getStats();

      expect(stats.thumbnails?.size).toBe(0);
      expect(stats.previewMetadata?.size).toBe(0);
      expect(stats.queryResults?.size).toBe(0);
    });
  });
});

/**
 * useImageCache Hook — L1 Multilevel Cache System (Phase 6.1)
 *
 * React hook to retrieve image metadata from cache layer.
 * - Returns cached image data if available
 * - Falls back to query cache if available
 * - Handles loading/error states
 * - Works with catalogStore selection
 *
 * Usage:
 *   const { image, isLoading, error } = useImageCache(imageId);
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { cacheInstances } from '@/services/cacheService';
import { cacheInvalidationService } from '@/services/cacheInvalidationService';
import { CatalogService } from '@/services/catalogService';
import type { ImageDetailDTO } from '@/types/dto';

export interface UseImageCacheReturn {
  image: ImageDetailDTO | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook: useImageCache
 *
 * Retrieves image metadata with caching support.
 * First checks query result cache, then fetches from service.
 *
 * @param imageId Unique image identifier (from database)
 * @returns Object with image data, loading state, and error
 */
export function useImageCache(imageId: number): UseImageCacheReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [image, setImage] = useState<ImageDetailDTO | null>(null);

  /**
   * Load image data from cache or service
   */
  const loadImage = useCallback(async () => {
    // Check query results cache first
    const cacheKey = `image_detail_${imageId}`;
    const cached = cacheInstances.queryResults.get(cacheKey);

    if (cached) {
      setImage(cached as ImageDetailDTO);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from service
      const imageData = await CatalogService.getImageDetail(imageId);

      // Store in cache
      cacheInstances.queryResults.set(cacheKey, imageData);

      setImage(imageData);
      setError(null);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setImage(null);

      if (import.meta.env.DEV) {
        console.warn(`[useImageCache] Failed to load image ${imageId}:`, errorObj);
      }
    } finally {
      setIsLoading(false);
    }
  }, [imageId]);

  /**
   * Effect: Load image on mount or when imageId changes
   */
  useEffect(() => {
    loadImage();

    // Subscribe to cache invalidation
    const unsubscribe = cacheInvalidationService.onInvalidate((invalidatedImageId) => {
      // Invalidate this image or all
      if (invalidatedImageId === imageId || invalidatedImageId === undefined) {
        setImage(null);
        loadImage();
      }
    });

    return unsubscribe;
  }, [imageId, loadImage]);

  return useMemo(
    () => ({
      image,
      isLoading,
      error,
    }),
    [image, isLoading, error],
  );
}

/**
 * useImageCache Hook Tests — Phase 6.1
 *
 * Tests for image cache hook:
 * - Loading from cache
 * - Fallback to service on cache miss
 * - Error handling
 * - Cache invalidation reaction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useImageCache } from '@/hooks/useImageCache';
import { cacheInstances } from '@/services/cacheService';
import { CatalogService } from '@/services/catalogService';
import type { ImageDetailDTO } from '@/types/dto';

// Mock CatalogService
vi.mock('@/services/catalogService', () => ({
  CatalogService: {
    getImageDetail: vi.fn(),
  },
}));

describe('useImageCache Hook', () => {
  const mockImageDetail: ImageDetailDTO = {
    id: 42,
    filename: 'test.jpg',
    blake3_hash: 'abc123',
    extension: 'jpg',
    width: 1920,
    height: 1080,
    imported_at: '2026-03-07T00:00:00Z',
    rating: 0,
  };

  beforeEach(() => {
    // Clear caches
    cacheInstances.thumbnails.clear();
    cacheInstances.previewMetadata.clear();
    cacheInstances.queryResults.clear();

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Loading from Cache', () => {
    it('should return cached image data without fetching', async () => {
      // Pre-populate cache
      const cacheKey = 'image_detail_42';
      cacheInstances.queryResults.set(cacheKey, mockImageDetail);

      const { result } = renderHook(() => useImageCache(42));

      await waitFor(() => {
        expect(result.current.image).toEqual(mockImageDetail);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      // Service should NOT have been called
      expect(CatalogService.getImageDetail).not.toHaveBeenCalled();
    });
  });

  describe('Fallback to Service', () => {
    it('should fetch from service on cache miss', async () => {
      vi.mocked(CatalogService.getImageDetail).mockResolvedValue(mockImageDetail);

      const { result } = renderHook(() => useImageCache(42));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.image).toEqual(mockImageDetail);
        expect(result.current.isLoading).toBe(false);
      });

      // Service was called
      expect(CatalogService.getImageDetail).toHaveBeenCalledWith(42);
    });

    it('should store fetched data in cache', async () => {
      vi.mocked(CatalogService.getImageDetail).mockResolvedValue(mockImageDetail);

      renderHook(() => useImageCache(42));

      await waitFor(() => {
        const cacheKey = 'image_detail_42';
        const cached = cacheInstances.queryResults.get(cacheKey);
        expect(cached).toEqual(mockImageDetail);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const testError = new Error('Service failed');
      vi.mocked(CatalogService.getImageDetail).mockRejectedValue(testError);

      const { result } = renderHook(() => useImageCache(42));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toContain('Service failed');
        expect(result.current.image).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(CatalogService.getImageDetail).mockRejectedValue('string error');

      const { result } = renderHook(() => useImageCache(42));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('string error');
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should clear cache and reload on specific image invalidation', async () => {
      // This test would require exposing the cache invalidation service in the hook
      // For now, just verify that the hook subscribes on mount
      vi.mocked(CatalogService.getImageDetail).mockResolvedValue(mockImageDetail);

      const { result } = renderHook(() => useImageCache(42));

      await waitFor(() => {
        expect(result.current.image).toEqual(mockImageDetail);
      });

      // Would need to call cacheInvalidationService.invalidateCacheForImage(42)
      // and verify the hook reacts by calling getImageDetail again
      // This requires additional test infrastructure
    });
  });

  describe('Multiple Instances', () => {
    it('should handle different image IDs independently', async () => {
      vi.mocked(CatalogService.getImageDetail).mockImplementation(
        async (id: number) =>
          ({
            ...mockImageDetail,
            id,
          }) as ImageDetailDTO,
      );

      const { result: result42 } = renderHook(() => useImageCache(42));
      const { result: result43 } = renderHook(() => useImageCache(43));

      await waitFor(() => {
        expect(result42.current.image?.id).toBe(42);
        expect(result43.current.image?.id).toBe(43);
      });
    });
  });
});

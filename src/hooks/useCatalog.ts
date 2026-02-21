/**
 * useCatalog Hook - Interface for catalog operations
 * 
 * This hook provides a clean interface for components to interact with
 * the catalog service and update the catalog store with real data from SQLite.
 */

import { useCallback, useState } from 'react';
import { useCatalogStore } from '@/stores/catalogStore';
import { CatalogService } from '@/services/catalogService';
import { previewService } from '@/services/previewService';
import { useSystemStore } from '@/stores/systemStore';
import type { ImageDTO, ImageFilter } from '@/types/dto';
import type { CatalogImage, FlagType } from '@/types';
import { PreviewType } from '@/types';
import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Hook return type
 */
export interface UseCatalogReturn {
  // Data
  images: CatalogImage[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  
  // Actions
  refreshCatalog: (filter?: ImageFilter) => Promise<void>;
  syncAfterImport: () => Promise<void>;
  clearError: () => void;
  
  // Computed
  imageCount: number;
  hasImages: boolean;
}

/**
 * Hook for managing catalog operations
 */
export function useCatalog(filter?: ImageFilter): UseCatalogReturn {
  const { images: storeImages, setImages, addImages } = useCatalogStore();
  const { addLog } = useSystemStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh catalog from database
  const refreshCatalog = useCallback(async (refreshFilter?: ImageFilter) => {
    try {
      setIsLoading(true);
      setError(null);
      
      addLog('Refreshing catalog from database...', 'sqlite');
      
      const images = await CatalogService.getAllImages(refreshFilter || filter);
      
      // Convert ImageDTO to CatalogImage format expected by store
      const catalogImages = await Promise.all(images.map(async (img: ImageDTO) => {
        // Try to get thumbnail preview URL, fallback to empty string
        let thumbnailUrl = '';
        try {
          const preview = await previewService.getPreviewPath(img.blake3_hash, PreviewType.Thumbnail);
          if (preview && typeof preview === 'string') {
            // Convert file path to URL that navigator can load (asset:// URL in Tauri v2)
            const assetUrl = convertFileSrc(preview);
            console.warn(`[useCatalog] Preview URL for ${img.filename}: ${assetUrl}`);
            thumbnailUrl = assetUrl;
          }
        } catch (error) {
          // Preview not available yet, will be generated during ingestion
          console.warn(`Thumbnail not available for ${img.filename}:`, error);
        }

        return {
          id: img.id,
          hash: img.blake3_hash,
          filename: img.filename,
          url: thumbnailUrl, // Use real thumbnail URL or empty
          capturedAt: img.captured_at || '',
          exif: {
            iso: img.iso,
            aperture: img.aperture,
            shutterSpeed: img.shutter_speed != null
              ? (img.shutter_speed >= 1
                ? `${img.shutter_speed}s`
                : `1/${Math.round(1 / img.shutter_speed)}`)
              : undefined,
            focalLength: img.focal_length,
            lens: img.lens,
            cameraMake: img.camera_make,
            cameraModel: img.camera_model,
          },
          state: {
            rating: img.rating || 0,
            flag: (img.flag || null) as FlagType,
            edits: {
              exposure: 0,
              contrast: 0,
              highlights: 0,
              shadows: 0,
              temp: 0,
              tint: 0,
              vibrance: 0,
              saturation: 0,
              clarity: 0,
            },
            isSynced: true,
            revision: '1',
            tags: [],
          },
          sizeOnDisk: '0 MB', // Will be calculated when needed
        };
      }));
      
      setImages(catalogImages);
      setLastSyncTime(new Date());
      
      addLog(`Catalog refreshed: ${catalogImages.length} images loaded`, 'sync');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to refresh catalog';
      setError(errorMsg);
      addLog(`Catalog refresh failed: ${errorMsg}`, 'error');
      console.error('Catalog refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, setImages, addLog]);

  // Sync after import - optimized for adding new images
  const syncAfterImport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      addLog('Syncing catalog after import...', 'sync');
      
      // Get all images (could be optimized to get only new images in future)
      const images = await CatalogService.getAllImages(filter);
      
      // Convert to catalog format
      const catalogImages = await Promise.all(images.map(async (img: ImageDTO) => {
        // Try to get thumbnail preview URL, fallback to empty string
        let thumbnailUrl = '';
        try {
          const preview = await previewService.getPreviewPath(img.blake3_hash, PreviewType.Thumbnail);
          if (preview && typeof preview === 'string') {
            const assetUrl = convertFileSrc(preview);
            console.warn(`[useCatalog] Sync preview URL for ${img.filename}: ${assetUrl}`);
            thumbnailUrl = assetUrl;
          }
        } catch (error) {
          // Preview not available yet, will be generated during ingestion
          console.warn(`Thumbnail sync error for ${img.filename}:`, error);
        }

        return {
          id: img.id,
          hash: img.blake3_hash,
          filename: img.filename,
          url: thumbnailUrl, // Use real thumbnail URL or empty
          capturedAt: img.captured_at || '',
          exif: {
            iso: img.iso,
            aperture: img.aperture,
            shutterSpeed: img.shutter_speed != null
              ? (img.shutter_speed >= 1
                ? `${img.shutter_speed}s`
                : `1/${Math.round(1 / img.shutter_speed)}`)
              : undefined,
            focalLength: img.focal_length,
            lens: img.lens,
            cameraMake: img.camera_make,
            cameraModel: img.camera_model,
          },
          state: {
            rating: img.rating || 0,
            flag: (img.flag || null) as FlagType,
            edits: {
              exposure: 0,
              contrast: 0,
              highlights: 0,
              shadows: 0,
              temp: 0,
              tint: 0,
              vibrance: 0,
              saturation: 0,
              clarity: 0,
            },
            isSynced: true,
            revision: '1',
            tags: [],
          },
          sizeOnDisk: '0 MB', // Will be calculated when needed
        };
      }));
      
      // Performance optimization: use setImages for large imports, addImages for small ones
      const currentImageCount = storeImages.length;
      const newImageCount = catalogImages.length;
      
      if (currentImageCount === 0 || newImageCount > currentImageCount * 1.5) {
        // Full refresh for empty catalog or large imports
        addLog(`Performing full catalog refresh: ${newImageCount} images`, 'sync');
        setImages(catalogImages);
      } else {
        // Incremental update for smaller imports
        addLog(`Performing incremental update: ${newImageCount - currentImageCount} new images`, 'sync');
        // Only add images that aren't already in the store
        const existingIds = new Set(storeImages.map((img: CatalogImage) => img.id));
        const newImages = catalogImages.filter((img: CatalogImage) => !existingIds.has(img.id));
        if (newImages.length > 0) {
          addImages(newImages);
        }
      }
      
      setLastSyncTime(new Date());
      
      addLog(`Catalog synced after import: ${catalogImages.length} total images`, 'sync');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to sync catalog';
      setError(errorMsg);
      addLog(`Catalog sync failed: ${errorMsg}`, 'error');
      console.error('Catalog sync error:', error);
      
      // Retry logic for sync failures (with exponential backoff)
      const retryDelay = Math.min(2000 * Math.pow(2, 1), 10000); // Max 10 seconds
      setTimeout(() => {
        addLog(`Retrying catalog sync in ${retryDelay / 1000}s...`, 'sync');
        syncAfterImport();
      }, retryDelay);
    } finally {
      setIsLoading(false);
    }
  }, [filter, storeImages, setImages, addImages, addLog]);

  // Initial load - removed to prevent infinite loop
  // Catalog loading is now explicitly triggered from App.tsx on mount

  return {
    // Data
    images: storeImages,
    isLoading,
    error,
    lastSyncTime,
    
    // Actions
    refreshCatalog,
    syncAfterImport,
    clearError,
    
    // Computed
    imageCount: storeImages.length,
    hasImages: storeImages.length > 0,
  };
}

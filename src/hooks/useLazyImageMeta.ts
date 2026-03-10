import { useEffect, useMemo, useState } from 'react';
import { imageDataService } from '@/services/imageDataService';
import { useCatalogStore } from '@/stores/catalogStore';
import type { ExifData } from '@/types';

interface UseLazyImageMetaResult {
  data?: ExifData;
  loading: boolean;
  error?: string;
}

interface FetchResult {
  fetchedId: number;
  data?: ExifData;
  error?: string;
}

function hasExifContent(exif: ExifData | undefined): boolean {
  if (!exif) {
    return false;
  }

  return (
    exif.iso != null ||
    exif.aperture != null ||
    exif.shutterSpeed != null ||
    exif.focalLength != null ||
    exif.lens != null ||
    exif.cameraMake != null ||
    exif.cameraModel != null
  );
}

export function useLazyImageMeta(
  imageId: number | null | undefined,
  enabled = false,
): UseLazyImageMetaResult {
  const setImageExif = useCatalogStore((state) => state.setImageExif);
  const imageExif = useCatalogStore(
    useMemo(() => (state) => state.images.find((img) => img.id === imageId)?.exif, [imageId]),
  );
  const [result, setResult] = useState<FetchResult | null>(null);

  useEffect(() => {
    if (!enabled || imageId == null) {
      return;
    }

    if (hasExifContent(imageExif)) {
      return;
    }

    let isCancelled = false;

    imageDataService
      .getImageExif(imageId)
      .then((meta) => {
        if (isCancelled) {
          return;
        }
        setResult({ fetchedId: imageId, data: meta });
        setImageExif(imageId, meta);
      })
      .catch((err: unknown) => {
        if (isCancelled) {
          return;
        }
        setResult({
          fetchedId: imageId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, imageId, imageExif, setImageExif]);

  const hasStoreExif = hasExifContent(imageExif);
  const isCurrentResult = result?.fetchedId === imageId;
  const data = hasStoreExif ? imageExif : isCurrentResult ? result?.data : undefined;
  const error = isCurrentResult ? result?.error : undefined;
  const loading = Boolean(enabled && imageId != null && !hasStoreExif && !isCurrentResult);

  return {
    data,
    loading,
    error,
  };
}

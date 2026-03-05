import { useState, useEffect } from 'react';
import { CatalogService } from '../services/catalogService';
import type { ExifData } from '../types';
import type { ExifMetadataDTO } from '../types/dto';

/**
 * Convertit un ExifMetadataDTO (snake_case, shutter_speed en log2) en ExifData (camelCase, shutter en string lisible).
 */
function mapDtoToExif(dto: ExifMetadataDTO): ExifData {
  const shutterSpeed = (() => {
    if (dto.shutter_speed == null) return undefined;
    // DB stores log2(seconds): e.g. 1/125s → -6.97
    const seconds = Math.pow(2, dto.shutter_speed);
    return seconds >= 1 ? `${seconds.toFixed(1)}s` : `1/${Math.round(1 / seconds)}`;
  })();

  return {
    iso: dto.iso,
    aperture: dto.aperture,
    shutterSpeed,
    focalLength: dto.focal_length,
    lens: dto.lens,
    cameraMake: dto.camera_make,
    cameraModel: dto.camera_model,
    gpsLat: dto.gps_lat,
    gpsLon: dto.gps_lon,
    colorSpace: dto.color_space,
  };
}

interface FetchResult {
  /** imageId pour lequel ce résultat a été chargé */
  fetchedId: number;
  exif: ExifData | null;
  error: string | null;
}

interface UseExifResult {
  exif: ExifData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook React pour charger les métadonnées EXIF complètes d'une image.
 * Appelle get_image_exif (Tauri) dès que imageId change.
 * Inclut GPS et color_space absents du ImageDTO de base.
 *
 * `isLoading` est dérivé (pas de setState synchrone dans l'effet).
 */
export function useExif(imageId: number | null): UseExifResult {
  const [result, setResult] = useState<FetchResult | null>(null);

  useEffect(() => {
    if (imageId == null) return;

    let cancelled = false;

    CatalogService.getImageExif(imageId)
      .then((dto) => {
        if (!cancelled) {
          setResult({ fetchedId: imageId, exif: mapDtoToExif(dto), error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setResult({ fetchedId: imageId, exif: null, error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageId]);

  if (imageId == null) {
    return { exif: null, isLoading: false, error: null };
  }

  const isCurrent = result?.fetchedId === imageId;
  return {
    exif: isCurrent ? result.exif : null,
    // isLoading tant que le résultat ne correspond pas encore à imageId actuel
    isLoading: !isCurrent,
    error: isCurrent ? result.error : null,
  };
}

import { CatalogService } from '@/services/catalogService';
import type { ExifData } from '@/types';
import type { ExifMetadataDTO } from '@/types/dto';

function mapDtoToExif(dto: ExifMetadataDTO): ExifData {
  const shutterSpeed = (() => {
    if (dto.shutter_speed == null) return undefined;
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

class ImageDataService {
  private exifCache = new Map<number, ExifData>();
  private inflight = new Map<number, Promise<ExifData>>();

  async getImageExif(imageId: number, force = false): Promise<ExifData> {
    if (!force) {
      const cached = this.exifCache.get(imageId);
      if (cached) {
        return cached;
      }
    }

    const pending = this.inflight.get(imageId);
    if (pending && !force) {
      return pending;
    }

    const request = CatalogService.getImageExif(imageId)
      .then((dto) => {
        const mapped = mapDtoToExif(dto);
        this.exifCache.set(imageId, mapped);
        return mapped;
      })
      .finally(() => {
        this.inflight.delete(imageId);
      });

    this.inflight.set(imageId, request);
    return request;
  }

  prefetchImageExif(imageId: number): void {
    void this.getImageExif(imageId).catch(() => {
      // Prefetch is best-effort and must not throw into UI handlers.
    });
  }

  clearExifCache(): void {
    this.exifCache.clear();
    this.inflight.clear();
  }
}

export const imageDataService = new ImageDataService();

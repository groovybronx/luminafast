import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExif } from '../useExif';
import { CatalogService } from '@/services/catalogService';
import type { ExifMetadataDTO } from '@/types/dto';

// Mock CatalogService
vi.mock('@/services/catalogService', () => ({
  CatalogService: {
    getImageExif: vi.fn(),
  },
}));

const mockGetImageExif = vi.mocked(CatalogService.getImageExif);

const makeExifDTO = (overrides: Partial<ExifMetadataDTO> = {}): ExifMetadataDTO => ({
  iso: 400,
  aperture: 2.8,
  shutter_speed: -6.965784, // log2(1/125) ≈ -6.966 → "1/125"
  focal_length: 35.0,
  lens: 'XF 35mm F2 R WR',
  camera_make: 'FUJIFILM',
  camera_model: 'X-T5',
  gps_lat: 48.8566,
  gps_lon: 2.3522,
  color_space: 'sRGB',
  ...overrides,
});

describe('useExif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('imageId == null', () => {
    it('retourne exif=null, isLoading=false, error=null sans appeler le service', () => {
      const { result } = renderHook(() => useExif(null));

      expect(result.current.exif).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetImageExif).not.toHaveBeenCalled();
    });
  });

  describe('chargement réussi', () => {
    it("appelle getImageExif avec l'id correct", async () => {
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO());

      const { result } = renderHook(() => useExif(42));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockGetImageExif).toHaveBeenCalledOnce();
      expect(mockGetImageExif).toHaveBeenCalledWith(42);
    });

    it('convertit le DTO en ExifData avec camelCase', async () => {
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO());

      const { result } = renderHook(() => useExif(1));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const exif = result.current.exif;
      expect(exif).not.toBeNull();
      expect(exif?.iso).toBe(400);
      expect(exif?.aperture).toBe(2.8);
      expect(exif?.focalLength).toBe(35.0);
      expect(exif?.lens).toBe('XF 35mm F2 R WR');
      expect(exif?.cameraMake).toBe('FUJIFILM');
      expect(exif?.cameraModel).toBe('X-T5');
      expect(exif?.gpsLat).toBe(48.8566);
      expect(exif?.gpsLon).toBe(2.3522);
      expect(exif?.colorSpace).toBe('sRGB');
      expect(result.current.error).toBeNull();
    });

    it('convertit shutter_speed log2 en fraction lisible (1/125)', async () => {
      // log2(1/125) = -log2(125) ≈ -6.9657
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO({ shutter_speed: -6.9657 }));

      const { result } = renderHook(() => useExif(1));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Math.pow(2, -6.9657) ≈ 0.008 → seconds < 1 → "1/125"
      expect(result.current.exif?.shutterSpeed).toBe('1/125');
    });

    it('convertit shutter_speed log2 pour une vitesse ≥ 1s', async () => {
      // log2(2) = 1 → 2.0s
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO({ shutter_speed: 1.0 }));

      const { result } = renderHook(() => useExif(1));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.exif?.shutterSpeed).toBe('2.0s');
    });

    it('retourne shutterSpeed=undefined si shutter_speed est absent du DTO', async () => {
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO({ shutter_speed: undefined }));

      const { result } = renderHook(() => useExif(1));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.exif?.shutterSpeed).toBeUndefined();
    });
  });

  describe('état isLoading', () => {
    it('est true pendant le chargement', () => {
      // Promesse qui ne se résout jamais
      mockGetImageExif.mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useExif(5));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.exif).toBeNull();
    });

    it('passe à false après résolution', async () => {
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO());

      const { result } = renderHook(() => useExif(5));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.exif).not.toBeNull();
    });
  });

  describe('gestion des erreurs', () => {
    it("expose le message d'erreur si le service échoue", async () => {
      mockGetImageExif.mockRejectedValueOnce(new Error('EXIF not found for image 99'));

      const { result } = renderHook(() => useExif(99));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('EXIF not found for image 99');
      expect(result.current.exif).toBeNull();
    });

    it('convertit les erreurs non-Error en string', async () => {
      mockGetImageExif.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useExif(99));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('string error');
    });
  });

  describe("changement d'imageId", () => {
    it('recharge quand imageId change', async () => {
      mockGetImageExif
        .mockResolvedValueOnce(makeExifDTO({ iso: 100 }))
        .mockResolvedValueOnce(makeExifDTO({ iso: 800 }));

      const { result, rerender } = renderHook(({ id }) => useExif(id), {
        initialProps: { id: 1 as number | null },
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.exif?.iso).toBe(100);

      rerender({ id: 2 });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.exif?.iso).toBe(800);
      expect(mockGetImageExif).toHaveBeenCalledTimes(2);
    });

    it('retourne null après passage à imageId=null', async () => {
      mockGetImageExif.mockResolvedValueOnce(makeExifDTO());

      const { result, rerender } = renderHook(({ id }) => useExif(id), {
        initialProps: { id: 1 as number | null },
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.exif).not.toBeNull();

      rerender({ id: null });

      expect(result.current.exif).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

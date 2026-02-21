import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCatalog } from '../useCatalog';
import { useCatalogStore } from '@/stores/catalogStore';
import { useSystemStore } from '@/stores/systemStore';
import { CatalogService } from '@/services/catalogService';
import { previewService } from '@/services/previewService';
import type { ImageDTO } from '@/types/dto';

// Mock Tauri core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

// Mock CatalogService
vi.mock('@/services/catalogService', () => ({
  CatalogService: {
    getAllImages: vi.fn(),
    searchImages: vi.fn(),
    updateImageState: vi.fn(),
  },
}));

// Mock previewService
vi.mock('@/services/previewService', () => ({
  previewService: {
    getPreviewPath: vi.fn().mockRejectedValue(new Error('No preview')),
  },
}));

const mockGetAllImages = vi.mocked(CatalogService.getAllImages);

const makeImageDTO = (overrides: Partial<ImageDTO> = {}): ImageDTO => ({
  id: 1,
  blake3_hash: 'abc123',
  filename: 'TEST_001.RAF',
  extension: 'raf',
  width: 8000,
  height: 5320,
  rating: 4,
  flag: 'pick',
  captured_at: '2025-01-01T10:00:00Z',
  imported_at: '2025-01-02T12:00:00Z',
  iso: 400,
  aperture: 2.8,
  shutter_speed: 1 / 500, // 0.002 -> "1/500"
  focal_length: 35.0,
  lens: 'XF 35mm F2 R WR',
  camera_make: 'FUJIFILM',
  camera_model: 'X-T5',
  ...overrides,
});

describe('useCatalog', () => {
  beforeEach(() => {
    // Reset stores to initial state
    useCatalogStore.setState({ images: [] });
    useSystemStore.setState({ logs: [] });
    vi.clearAllMocks();
    // Ensure previewService rejects by default (no previews available)
    vi.mocked(previewService.getPreviewPath).mockRejectedValue(new Error('No preview'));
  });

  it('devrait mapper les champs EXIF correctement depuis le DTO', async () => {
    const dto = makeImageDTO();
    mockGetAllImages.mockResolvedValue([dto]);

    const { result } = renderHook(() => useCatalog());

    await act(async () => {
      await result.current.refreshCatalog();
    });

    const images = useCatalogStore.getState().images;
    expect(images).toHaveLength(1);

    const img = images[0]!;
    expect(img.exif.iso).toBe(400);
    expect(img.exif.aperture).toBe(2.8);
    // shutter_speed = 1/500 = 0.002 → "1/500"
    expect(img.exif.shutterSpeed).toBe('1/500');
    expect(img.exif.focalLength).toBe(35.0);
    expect(img.exif.lens).toBe('XF 35mm F2 R WR');
    expect(img.exif.cameraMake).toBe('FUJIFILM');
    expect(img.exif.cameraModel).toBe('X-T5');
  });

  it('devrait gérer les champs EXIF absents (NULL en base)', async () => {
    const dto = makeImageDTO({
      iso: undefined,
      aperture: undefined,
      shutter_speed: undefined,
      focal_length: undefined,
      lens: undefined,
      camera_make: undefined,
      camera_model: undefined,
    });
    mockGetAllImages.mockResolvedValue([dto]);

    const { result } = renderHook(() => useCatalog());

    await act(async () => {
      await result.current.refreshCatalog();
    });

    const img = useCatalogStore.getState().images[0]!;
    expect(img.exif.iso).toBeUndefined();
    expect(img.exif.aperture).toBeUndefined();
    expect(img.exif.shutterSpeed).toBeUndefined();
    expect(img.exif.lens).toBeUndefined();
    expect(img.exif.cameraMake).toBeUndefined();
    expect(img.exif.cameraModel).toBeUndefined();
  });

  it('devrait formater shutter_speed long exposure (>= 1s)', async () => {
    const dto = makeImageDTO({ shutter_speed: 2.5 });
    mockGetAllImages.mockResolvedValue([dto]);

    const { result } = renderHook(() => useCatalog());

    await act(async () => {
      await result.current.refreshCatalog();
    });

    const img = useCatalogStore.getState().images[0]!;
    expect(img.exif.shutterSpeed).toBe('2.5s');
  });

  it("devrait gérer l'erreur et mettre à jour error state", async () => {
    mockGetAllImages.mockRejectedValue(new Error('DB connection failed'));

    const { result } = renderHook(() => useCatalog());

    await act(async () => {
      await result.current.refreshCatalog();
    });

    expect(result.current.error).toBe('DB connection failed');
    expect(result.current.isLoading).toBe(false);
  });

  it("devrait réinitialiser l'erreur avec clearError", async () => {
    mockGetAllImages.mockRejectedValue(new Error('Some error'));

    const { result } = renderHook(() => useCatalog());

    await act(async () => {
      await result.current.refreshCatalog();
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('devrait calculer imageCount et hasImages correctement', async () => {
    mockGetAllImages.mockResolvedValue([makeImageDTO({ id: 1 }), makeImageDTO({ id: 2 })]);

    const { result } = renderHook(() => useCatalog());

    expect(result.current.imageCount).toBe(0);
    expect(result.current.hasImages).toBe(false);

    await act(async () => {
      await result.current.refreshCatalog();
    });

    await waitFor(() => {
      expect(result.current.imageCount).toBe(2);
    });
    expect(result.current.hasImages).toBe(true);
  });
});

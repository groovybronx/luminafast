import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLazyImageMeta } from '@/hooks/useLazyImageMeta';
import { useCatalogStore } from '@/stores/catalogStore';
import { imageDataService } from '@/services/imageDataService';

vi.mock('@/services/imageDataService', () => ({
  imageDataService: {
    getImageExif: vi.fn(),
  },
}));

describe('useLazyImageMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCatalogStore.setState({
      images: [],
      selection: new Set(),
      filterText: '',
      activeImageId: null,
    });
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useLazyImageMeta(1, false));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(imageDataService.getImageExif).not.toHaveBeenCalled();
  });

  it('fetches metadata when enabled and image has no exif', async () => {
    useCatalogStore.setState({
      images: [
        {
          id: 1,
          hash: 'h',
          filename: 'a.jpg',
          urls: { thumbnail: '', standard: '' },
          capturedAt: '',
          exif: {},
          state: {
            rating: 0,
            flag: null,
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
          sizeOnDisk: '0 MB',
        },
      ],
    });

    vi.mocked(imageDataService.getImageExif).mockResolvedValue({
      iso: 100,
      cameraModel: 'X-T5',
    });

    const { result } = renderHook(() => useLazyImageMeta(1, true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(imageDataService.getImageExif).toHaveBeenCalledWith(1);
    expect(result.current.data?.iso).toBe(100);
  });
});

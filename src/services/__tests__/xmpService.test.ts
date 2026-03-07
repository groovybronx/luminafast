import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XmpService } from '@/services/xmpService';

const mockTauriInvoke = vi.fn();

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: { invoke: mockTauriInvoke },
  writable: true,
});

describe('XmpService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── exportImageXmp ────────────────────────────────────────────────────────────

  describe('exportImageXmp', () => {
    it('invokes export_image_xmp with imageId', async () => {
      mockTauriInvoke.mockResolvedValue('/photos/shot.xmp');

      const result = await XmpService.exportImageXmp(1);

      expect(mockTauriInvoke).toHaveBeenCalledWith('export_image_xmp', { imageId: 1 });
      expect(result).toBe('/photos/shot.xmp');
    });

    it('propagates Tauri errors', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Image 99 has no known file path'));

      await expect(XmpService.exportImageXmp(99)).rejects.toThrow(
        'Image 99 has no known file path',
      );
    });
  });

  // ── importImageXmp ────────────────────────────────────────────────────────────

  describe('importImageXmp', () => {
    it('invokes import_image_xmp with imageId', async () => {
      const dto = { rating: 3, flag: 'pick', tagsImported: 4 };
      mockTauriInvoke.mockResolvedValue(dto);

      const result = await XmpService.importImageXmp(2);

      expect(mockTauriInvoke).toHaveBeenCalledWith('import_image_xmp', { imageId: 2 });
      expect(result).toEqual(dto);
    });

    it('returns null rating and flag when xmp has no star/flag', async () => {
      const dto = { rating: null, flag: null, tagsImported: 0 };
      mockTauriInvoke.mockResolvedValue(dto);

      const result = await XmpService.importImageXmp(3);

      expect(result.rating).toBeNull();
      expect(result.flag).toBeNull();
      expect(result.tagsImported).toBe(0);
    });

    it('propagates error when sidecar is missing', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('XMP sidecar not found'));

      await expect(XmpService.importImageXmp(5)).rejects.toThrow('XMP sidecar not found');
    });
  });

  // ── getXmpStatus ──────────────────────────────────────────────────────────────

  describe('getXmpStatus', () => {
    it('invokes get_xmp_status with imageId', async () => {
      const dto = { exists: true, xmpPath: '/photos/shot.xmp' };
      mockTauriInvoke.mockResolvedValue(dto);

      const result = await XmpService.getXmpStatus(7);

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_xmp_status', { imageId: 7 });
      expect(result.exists).toBe(true);
      expect(result.xmpPath).toBe('/photos/shot.xmp');
    });

    it('returns exists=false when sidecar is absent', async () => {
      mockTauriInvoke.mockResolvedValue({ exists: false, xmpPath: '' });

      const result = await XmpService.getXmpStatus(8);

      expect(result.exists).toBe(false);
      expect(result.xmpPath).toBe('');
    });

    it('returns exists=false and empty path for image without ingestion history', async () => {
      mockTauriInvoke.mockResolvedValue({ exists: false, xmpPath: '' });

      const result = await XmpService.getXmpStatus(999);

      expect(result.exists).toBe(false);
    });
  });
});

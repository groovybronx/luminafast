import { save } from '@tauri-apps/plugin-dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDefaultExportFilename,
  ExportService,
  type ExportResultDTO,
} from '@/services/exportService';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

const mockTauriInvoke = vi.fn();

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: { invoke: mockTauriInvoke },
  writable: true,
});

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildDefaultExportFilename', () => {
    it('adds _edited suffix and jpg extension for jpeg format', () => {
      expect(buildDefaultExportFilename('portrait.CR3', 'jpeg')).toBe('portrait_edited.jpg');
    });

    it('handles filename without extension', () => {
      expect(buildDefaultExportFilename('capture', 'tiff')).toBe('capture_edited.tiff');
    });

    it('falls back to image when source filename is blank', () => {
      expect(buildDefaultExportFilename('   ', 'jpeg')).toBe('image_edited.jpg');
    });
  });

  describe('promptOutputPath', () => {
    it('opens save dialog with expected defaults for jpeg', async () => {
      vi.mocked(save).mockResolvedValue('/tmp/portrait_edited.jpg');

      const outputPath = await ExportService.promptOutputPath('portrait.CR3', 'jpeg');

      expect(outputPath).toBe('/tmp/portrait_edited.jpg');
      expect(save).toHaveBeenCalledWith({
        title: 'Export Edited Image',
        defaultPath: 'portrait_edited.jpg',
        filters: [
          {
            name: 'JPEG image',
            extensions: ['jpg', 'jpeg'],
          },
        ],
      });
    });

    it('opens save dialog with expected defaults for tiff', async () => {
      vi.mocked(save).mockResolvedValue('/tmp/portrait_edited.tiff');

      const outputPath = await ExportService.promptOutputPath('portrait.CR3', 'tiff');

      expect(outputPath).toBe('/tmp/portrait_edited.tiff');
      expect(save).toHaveBeenCalledWith({
        title: 'Export Edited Image',
        defaultPath: 'portrait_edited.tiff',
        filters: [
          {
            name: 'TIFF image',
            extensions: ['tif', 'tiff'],
          },
        ],
      });
    });
  });

  describe('exportEditedImage', () => {
    it('invokes export_image_edited command with camelCase args', async () => {
      const dto: ExportResultDTO = {
        imageId: 42,
        outputPath: '/tmp/portrait_edited.jpg',
        format: 'jpeg',
        width: 4000,
        height: 3000,
        appliedEditEvents: 6,
        usedSnapshot: false,
      };
      mockTauriInvoke.mockResolvedValue(dto);

      const result = await ExportService.exportEditedImage({
        imageId: 42,
        outputPath: '/tmp/portrait_edited.jpg',
        format: 'jpeg',
      });

      expect(mockTauriInvoke).toHaveBeenCalledWith('export_image_edited', {
        imageId: '42',
        outputPath: '/tmp/portrait_edited.jpg',
        format: 'jpeg',
      });
      expect(result).toEqual(dto);
    });

    it('invokes export_raw_edited when rawOnly=true', async () => {
      mockTauriInvoke.mockResolvedValue({
        imageId: 7,
        outputPath: '/tmp/raw_edited.tiff',
        format: 'tiff',
        width: 5000,
        height: 3400,
        appliedEditEvents: 3,
        usedSnapshot: true,
      } satisfies ExportResultDTO);

      await ExportService.exportEditedImage({
        imageId: 7,
        outputPath: '/tmp/raw_edited.tiff',
        format: 'tiff',
        rawOnly: true,
      });

      expect(mockTauriInvoke).toHaveBeenCalledWith('export_raw_edited', {
        imageId: '7',
        outputPath: '/tmp/raw_edited.tiff',
        format: 'tiff',
      });
    });
  });

  describe('exportWithDialog', () => {
    it('returns null when user cancels save dialog', async () => {
      vi.mocked(save).mockResolvedValue(null);

      const result = await ExportService.exportWithDialog({
        imageId: 1,
        sourceFilename: 'sample.nef',
      });

      expect(result).toBeNull();
      expect(mockTauriInvoke).not.toHaveBeenCalled();
    });
  });
});

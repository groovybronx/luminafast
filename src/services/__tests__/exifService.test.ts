import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExifService } from '../exifService';

const mockExif = {
  iso: 100,
  aperture: 2.8,
  shutter_speed: 1/125,
  date: '2026-02-20',
  gps: [48.8566, 2.3522],
  camera_model: 'MockCam X',
  lens_model: 'MockLens 50mm',
};

// Mock Tauri invoke
const mockInvoke = vi.fn().mockResolvedValue(mockExif);

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

describe('ExifService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extractExif appelle la commande Tauri et retourne les données', async () => {
    const result = await ExifService.extractExif('/mock/path.jpg');
    expect(result).toEqual(mockExif);
  });

  it('extractBatch appelle la commande batch et retourne un tableau', async () => {
    mockInvoke.mockResolvedValueOnce([mockExif, mockExif]);
    const result = await ExifService.extractBatch(['/mock/1.jpg', '/mock/2.jpg']);
    expect(result).toHaveLength(2);
  });
});

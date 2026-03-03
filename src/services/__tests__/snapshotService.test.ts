import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as snapshotService from '../snapshotService';
import type { SnapshotDTO } from '../snapshotService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('snapshotService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot with valid parameters', async () => {
      const mockSnapshot: SnapshotDTO = {
        id: 1,
        imageId: 100,
        name: 'Before color grading',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      };

      mockInvoke.mockResolvedValueOnce(mockSnapshot);

      const result = await snapshotService.createSnapshot(100, 'Before color grading', [], '[]');

      expect(mockInvoke).toHaveBeenCalledWith('create_snapshot', {
        imageId: 100,
        name: 'Before color grading',
        eventIds: [],
        snapshotData: '[]',
      });
      expect(result).toEqual(mockSnapshot);
    });

    it('should handle Tauri errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Tauri command failed'));

      await expect(snapshotService.createSnapshot(100, 'Test', [], '[]')).rejects.toThrow(
        'Failed to create snapshot',
      );
    });
  });

  describe('getSnapshots', () => {
    it('should retrieve snapshots for an image', async () => {
      const mockSnapshots: SnapshotDTO[] = [
        {
          id: 1,
          imageId: 100,
          name: 'Snapshot 1',
          snapshotData: '[]',
          eventIds: [],
          createdAt: '2025-03-02T12:00:00Z',
        },
        {
          id: 2,
          imageId: 100,
          name: 'Snapshot 2',
          snapshotData: '[]',
          eventIds: [],
          createdAt: '2025-03-02T11:00:00Z',
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockSnapshots);

      const result = await snapshotService.getSnapshots(100);

      expect(mockInvoke).toHaveBeenCalledWith('get_snapshots', { imageId: 100 });
      expect(result).toEqual(mockSnapshots);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no snapshots exist', async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const result = await snapshotService.getSnapshots(100);

      expect(result).toEqual([]);
    });

    it('should handle Tauri errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      await expect(snapshotService.getSnapshots(100)).rejects.toThrow('Failed to get snapshots');
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve a specific snapshot', async () => {
      const mockSnapshot: SnapshotDTO = {
        id: 1,
        imageId: 100,
        name: 'Snapshot 1',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      };

      mockInvoke.mockResolvedValueOnce(mockSnapshot);

      const result = await snapshotService.getSnapshot(1);

      expect(mockInvoke).toHaveBeenCalledWith('get_snapshot', { snapshotId: 1 });
      expect(result).toEqual(mockSnapshot);
    });

    it('should return null when snapshot not found', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const result = await snapshotService.getSnapshot(999);

      expect(result).toBeNull();
    });

    it('should handle Tauri errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      await expect(snapshotService.getSnapshot(1)).rejects.toThrow('Failed to get snapshot');
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await snapshotService.deleteSnapshot(1);

      expect(mockInvoke).toHaveBeenCalledWith('delete_snapshot', { snapshotId: 1 });
    });

    it('should handle Tauri errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      await expect(snapshotService.deleteSnapshot(1)).rejects.toThrow('Failed to delete snapshot');
    });
  });

  describe('renameSnapshot', () => {
    it('should rename a snapshot', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await snapshotService.renameSnapshot(1, 'New name');

      expect(mockInvoke).toHaveBeenCalledWith('rename_snapshot', {
        snapshotId: 1,
        newName: 'New name',
      });
    });

    it('should handle Tauri errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      await expect(snapshotService.renameSnapshot(1, 'New name')).rejects.toThrow(
        'Failed to rename snapshot',
      );
    });
  });
});

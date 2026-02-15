import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesystemService } from '@/services/filesystemService';
import { FilesystemErrorType } from '@/types';

// Mock Tauri internals
const mockTauriInvoke = vi.fn();

// Setup global mock
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: mockTauriInvoke,
  },
  writable: true,
});

describe('FilesystemService - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Not Found Errors', () => {
    it('should handle file not found in getFileMetadata', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'File not found: /nonexistent.jpg'
      });

      await expect(FilesystemService.getFileMetadata('/nonexistent.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileNotFound,
          message: expect.stringContaining('not found')
        });
    });

    it('should handle directory not found in listDirectory', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'Directory not found: /nonexistent/dir'
      });

      await expect(FilesystemService.listDirectory('/nonexistent/dir'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileNotFound
        });
    });

    it('should handle source file not found in move operation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'Source file not found'
      });

      await expect(FilesystemService.movePath('/missing.jpg', '/dest.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileNotFound
        });
    });

    it('should handle file not found in copy operation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'Source file does not exist'
      });

      await expect(FilesystemService.copyFile('/missing.jpg', '/copy.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileNotFound
        });
    });

    it('should handle file not found in delete operation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'File to delete not found'
      });

      await expect(FilesystemService.deletePath('/nonexistent.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileNotFound
        });
    });
  });

  describe('Permission Denied Errors', () => {
    it('should handle permission denied in getFileMetadata', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Permission denied: cannot read file metadata'
      });

      await expect(FilesystemService.getFileMetadata('/protected.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.PermissionDenied,
          message: expect.stringContaining('Permission denied')
        });
    });

    it('should handle permission denied in createDirectory', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Cannot create directory: permission denied'
      });

      await expect(FilesystemService.createDirectory('/root/newdir'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.PermissionDenied
        });
    });

    it('should handle permission denied in delete operation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Cannot delete: insufficient permissions'
      });

      await expect(FilesystemService.deletePath('/protected/file.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.PermissionDenied
        });
    });

    it('should handle read-only filesystem error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Filesystem is read-only'
      });

      await expect(FilesystemService.createDirectory('/readonly/dir'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.PermissionDenied
        });
    });

    it('should handle permission denied in move operation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Cannot move file: permission denied on destination'
      });

      await expect(FilesystemService.movePath('/file.jpg', '/protected/file.jpg'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.PermissionDenied
        });
    });
  });

  describe('Lock Conflicts', () => {
    it('should handle file already locked error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'File is already locked by another process'
      });

      await expect(FilesystemService.acquireLock('/locked.jpg', 'exclusive'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InternalError,
          message: expect.stringContaining('locked')
        });
    });

    it('should handle lock timeout error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Failed to acquire lock: timeout'
      });

      await expect(FilesystemService.acquireLock('/file.jpg', 'exclusive'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InternalError
        });
    });

    it('should handle invalid lock release', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid lock ID'
      });

      await expect(FilesystemService.releaseLock('invalid-lock-id'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InvalidInput
        });
    });

    it('should handle lock not found error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Lock not found'
      });

      await expect(FilesystemService.releaseLock('nonexistent-lock'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InternalError
        });
    });

    it('should handle deadlock detection', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Deadlock detected'
      });

      await expect(FilesystemService.acquireLock('/file.jpg', 'exclusive'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InternalError,
          message: expect.stringContaining('Deadlock')
        });
    });
  });

  describe('Watcher Errors', () => {
    it('should handle watcher initialization failure', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileSystem',
        message: 'Failed to initialize file watcher'
      });

      await expect(FilesystemService.startWatcher({ path: '/path', recursive: true }))
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileSystemError,
          message: expect.stringContaining('watcher')
        });
    });

    it('should handle invalid watcher path', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid watcher path'
      });

      await expect(FilesystemService.startWatcher({ path: '', recursive: true }))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InvalidInput
        });
    });

    it('should handle watcher not found on stop', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Watcher not found'
      });

      await expect(FilesystemService.stopWatcher('invalid-watcher-id'))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InternalError
        });
    });

    it('should handle watcher overflow error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileSystem',
        message: 'Watcher event queue overflow'
      });

      await expect(FilesystemService.getPendingEvents())
        .rejects.toMatchObject({
          type: FilesystemErrorType.FileSystemError,
          message: expect.stringContaining('overflow')
        });
    });

    it('should handle too many watchers error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Maximum number of watchers exceeded'
      });

      await expect(FilesystemService.startWatcher({ path: '/path', recursive: true }))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InternalError
        });
    });
  });

  describe('Invalid Input Errors', () => {
    it('should handle invalid path format', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid path format'
      });

      await expect(FilesystemService.getFileMetadata(''))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InvalidInput
        });
    });

    it('should handle invalid lock type', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid lock type'
      });

      await expect(FilesystemService.acquireLock('/file.jpg', 'invalid' as any))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InvalidInput
        });
    });

    it('should handle empty file path', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'File path cannot be empty'
      });

      await expect(FilesystemService.getFileMetadata(''))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InvalidInput
        });
    });

    it('should handle invalid destination path in copy', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid destination path'
      });

      await expect(FilesystemService.copyFile('/source.jpg', ''))
        .rejects.toMatchObject({
          type: FilesystemErrorType.InvalidInput
        });
    });
  });
});

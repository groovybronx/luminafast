import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HashingService } from '@/services/hashingService';
import { HashErrorType } from '@/types';

// Mock Tauri internals
const mockTauriInvoke = vi.fn();

// Setup global mock
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: mockTauriInvoke,
  },
  writable: true,
});

describe('HashingService - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Not Found Errors', () => {
    it('should handle file not found in hashFile', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'File does not exist: /nonexistent.jpg'
      });

      await expect(HashingService.hashFile('/nonexistent.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.FileNotFound,
          message: expect.stringContaining('File does not exist')
        });
    });

    it('should handle file not found in batch operations', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'Some files not found'
      });

      await expect(HashingService.hashFilesBatch(['/nonexistent1.jpg', '/nonexistent2.jpg']))
        .rejects.toMatchObject({
          type: HashErrorType.FileNotFound,
          message: expect.stringContaining('not found')
        });
    });

    it('should handle partial file not found in batch', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'File not found: /path/to/missing.jpg'
      });

      await expect(HashingService.hashFilesBatch(['/valid.jpg', '/missing.jpg']))
        .rejects.toMatchObject({
          type: HashErrorType.FileNotFound
        });
    });

    it('should provide detailed file path in error for nonexistent file', async () => {
      const testPath = '/deeply/nested/nonexistent/file.raw';
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: `File not found: ${testPath}`
      });

      await expect(HashingService.hashFile(testPath))
        .rejects.toMatchObject({
          type: HashErrorType.FileNotFound,
          message: expect.stringContaining(testPath)
        });
    });

    it('should handle directory not found error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'Directory does not exist: /nonexistent/dir'
      });

      await expect(HashingService.hashFile('/nonexistent/dir/file.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.FileNotFound
        });
    });
  });

  describe('Permission Denied Errors', () => {
    it('should handle permission denied in hashFile', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Permission denied: /protected.jpg'
      });

      await expect(HashingService.hashFile('/protected.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.PermissionDenied,
          message: expect.stringContaining('Permission denied')
        });
    });

    it('should handle permission denied for system files', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Access denied to system file'
      });

      await expect(HashingService.hashFile('/root/protected.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.PermissionDenied
        });
    });

    it('should handle permission denied in batch operations', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Permission denied for one or more files'
      });

      await expect(HashingService.hashFilesBatch(['/file1.jpg', '/protected.jpg']))
        .rejects.toMatchObject({
          type: HashErrorType.PermissionDenied
        });
    });

    it('should handle read-only filesystem error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Filesystem is read-only'
      });

      await expect(HashingService.hashFile('/readonly/file.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.PermissionDenied
        });
    });
  });

  describe('Hash Computation Errors', () => {
    it('should handle corrupted file errors', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Hash',
        message: 'Failed to read file: corrupted data'
      });

      await expect(HashingService.hashFile('/corrupted.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.HashError,
          message: expect.stringContaining('Failed to read file')
        });
    });

    it('should handle invalid file format errors', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Hash',
        message: 'Invalid file format'
      });

      await expect(HashingService.hashFile('/invalid.xyz'))
        .rejects.toMatchObject({
          type: HashErrorType.HashError
        });
    });

    it('should handle file too large errors', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Hash',
        message: 'File too large: 5GB exceeds maximum size'
      });

      await expect(HashingService.hashFile('/huge.raw'))
        .rejects.toMatchObject({
          type: HashErrorType.HashError,
          message: expect.stringContaining('too large')
        });
    });

    it('should handle checksum verification failure', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Hash',
        message: 'Checksum verification failed'
      });

      await expect(HashingService.verifyFileIntegrity('/file.jpg', 'abc123'))
        .rejects.toMatchObject({
          type: HashErrorType.HashError
        });
    });
  });

  describe('Timeout Errors', () => {
    it('should handle timeout in batch operations', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Operation timed out'
      });

      await expect(HashingService.hashFilesBatch(['/huge.raw']))
        .rejects.toMatchObject({
          type: HashErrorType.InternalError,
          message: expect.stringContaining('timed out')
        });
    });

    it('should handle timeout for large file hashing', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Hash operation timed out after 30s'
      });

      await expect(HashingService.hashFile('/verylarge.raw'))
        .rejects.toMatchObject({
          type: HashErrorType.InternalError
        });
    });

    it('should handle timeout in duplicate detection', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Duplicate detection timed out'
      });

      await expect(HashingService.detectDuplicates(['/file1.jpg', '/file2.jpg']))
        .rejects.toMatchObject({
          type: HashErrorType.InternalError
        });
    });
  });

  describe('Cache Errors', () => {
    it('should handle cache read errors', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Cache corrupted'
      });

      await expect(HashingService.getCacheStats())
        .rejects.toMatchObject({
          type: HashErrorType.InternalError,
          message: expect.stringContaining('Cache')
        });
    });

    it('should handle cache write errors', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Failed to write to cache'
      });

      await expect(HashingService.hashFile('/file.jpg'))
        .rejects.toMatchObject({
          type: HashErrorType.InternalError
        });
    });

    it('should handle cache clear errors', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Failed to clear cache'
      });

      await expect(HashingService.clearCache())
        .rejects.toMatchObject({
          type: HashErrorType.InternalError
        });
    });

    it('should handle corrupted cache stats', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Cache statistics corrupted'
      });

      await expect(HashingService.getCacheStats())
        .rejects.toMatchObject({
          type: HashErrorType.InternalError
        });
    });
  });
});

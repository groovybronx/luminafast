import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryService } from '@/services/discoveryService';
import { DiscoveryErrorType } from '@/types';

// Mock Tauri internals
const mockTauriInvoke = vi.fn();

// Setup global mock
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: mockTauriInvoke,
  },
  writable: true,
});

describe('DiscoveryService - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invalid Path Errors', () => {
    it('should handle invalid root path in startDiscovery', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid discovery path'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '', extensions: [] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput,
          message: expect.stringContaining('Invalid')
        });
    });

    it('should handle non-existent directory path', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'FileNotFound',
        message: 'Discovery path does not exist: /nonexistent'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '/nonexistent', extensions: [] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.FileNotFound
        });
    });

    it('should handle empty root path', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Root path cannot be empty'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '', extensions: ['.jpg'] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });

    it('should handle invalid file path in validation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Path validation failed'
      });

      await expect(DiscoveryService.validateDiscoveryPath(''))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });

    it('should handle path with invalid characters', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Path contains invalid characters'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '/path<>with:bad*chars', extensions: [] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });
  });

  describe('Scanning Errors', () => {
    it('should handle permission denied during scan', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'PermissionDenied',
        message: 'Cannot scan directory: permission denied'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '/protected', extensions: [] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.PermissionDenied,
          message: expect.stringContaining('permission denied')
        });
    });

    it('should handle scan timeout error', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Discovery',
        message: 'Discovery scan timed out'
      });

      await expect(DiscoveryService.getDiscoveryStatus('session-id'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DiscoveryError,
          message: expect.stringContaining('timed out')
        });
    });

    it('should handle interrupted scan', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Discovery',
        message: 'Discovery scan was interrupted'
      });

      await expect(DiscoveryService.stopDiscovery('session-id'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DiscoveryError
        });
    });

    it('should handle corrupted scan state', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Discovery state corrupted'
      });

      await expect(DiscoveryService.getDiscoveryStatus('session-id'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InternalError
        });
    });

    it('should handle scan session not found', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Discovery',
        message: 'Discovery session not found'
      });

      await expect(DiscoveryService.getDiscoveryStatus('invalid-session'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DiscoveryError
        });
    });
  });

  describe('Ingestion Failures', () => {
    it('should handle file ingestion failure', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Discovery',
        message: 'Failed to ingest file: corrupted data'
      });

      await expect(DiscoveryService.ingestFile('/path/to/file.jpg'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DiscoveryError,
          message: expect.stringContaining('Failed to ingest')
        });
    });

    it('should handle batch ingestion partial failure', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Discovery',
        message: 'Some files failed to ingest'
      });

      await expect(DiscoveryService.batchIngest(['/file1.jpg', '/file2.jpg']))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DiscoveryError
        });
    });

    it('should handle unsupported file format in ingestion', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Unsupported file format: .xyz'
      });

      await expect(DiscoveryService.ingestFile('/file.xyz'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });

    it('should handle corrupted file during ingestion', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Discovery',
        message: 'File is corrupted and cannot be ingested'
      });

      await expect(DiscoveryService.ingestFile('/corrupted.jpg'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DiscoveryError
        });
    });

    it('should handle ingestion queue overflow', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Internal',
        message: 'Ingestion queue is full'
      });

      await expect(DiscoveryService.batchIngest(Array(1000).fill('/file.jpg')))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InternalError
        });
    });
  });

  describe('Database Errors', () => {
    it('should handle database connection failure during ingestion', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database connection failed'
      });

      await expect(DiscoveryService.ingestFile('/file.jpg'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DatabaseError,
          message: expect.stringContaining('Database')
        });
    });

    it('should handle database write failure', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Failed to write to database'
      });

      await expect(DiscoveryService.batchIngest(['/file.jpg']))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DatabaseError
        });
    });

    it('should handle duplicate key constraint violation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Duplicate entry: file already exists'
      });

      await expect(DiscoveryService.ingestFile('/existing.jpg'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DatabaseError
        });
    });

    it('should handle database lock timeout', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database is locked'
      });

      await expect(DiscoveryService.ingestFile('/file.jpg'))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DatabaseError
        });
    });

    it('should handle corrupted database', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database file is corrupted'
      });

      await expect(DiscoveryService.getAllDiscoverySessions())
        .rejects.toMatchObject({
          type: DiscoveryErrorType.DatabaseError
        });
    });
  });

  describe('Configuration Errors', () => {
    it('should handle invalid discovery config', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid discovery configuration'
      });

      await expect(DiscoveryService.createDiscoveryConfig({ rootPath: '', extensions: [] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });

    it('should handle empty extensions list when required', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Extensions list cannot be empty'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '/path', extensions: [] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });

    it('should handle invalid extension format', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid extension format: must start with dot'
      });

      await expect(DiscoveryService.startDiscovery({ rootPath: '/path', extensions: ['jpg'] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });

    it('should handle unsupported format in config', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Unsupported format in configuration'
      });

      await expect(DiscoveryService.createDiscoveryConfig({ rootPath: '/path', extensions: ['.xyz'] }))
        .rejects.toMatchObject({
          type: DiscoveryErrorType.InvalidInput
        });
    });
  });
});

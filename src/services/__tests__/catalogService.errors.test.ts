import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogService } from '@/services/catalogService';
import { CatalogErrorType } from '@/types';

// Mock Tauri internals
const mockTauriInvoke = vi.fn();

// Setup global mock
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: mockTauriInvoke,
  },
  writable: true,
});

describe('CatalogService - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CRUD Failures', () => {
    it('should handle image not found in getImageDetail', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Image not found'
      });

      await expect(CatalogService.getImageDetail(999))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError,
          message: expect.stringContaining('not found')
        });
    });

    it('should handle failed image creation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Failed to create image entry'
      });

      await expect(CatalogService.createImage({
        filename: 'test.jpg',
        blake3_hash: 'abc123',
        width: 1920,
        height: 1080
      }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle failed image update', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Failed to update image'
      });

      await expect(CatalogService.updateImageState(1, { rating: 5 }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle failed image deletion', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Failed to delete image'
      });

      await expect(CatalogService.deleteImage(1))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle collection not found', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Collection not found'
      });

      await expect(CatalogService.getCollection(999))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });
  });

  describe('Invalid Data Errors', () => {
    it('should handle invalid image ID', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid image ID'
      });

      await expect(CatalogService.getImageDetail(-1))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput,
          message: expect.stringContaining('Invalid')
        });
    });

    it('should handle invalid rating value', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Rating must be between 0 and 5'
      });

      await expect(CatalogService.updateImageState(1, { rating: 10 }))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput
        });
    });

    it('should handle empty collection name', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Collection name cannot be empty'
      });

      await expect(CatalogService.createCollection({ name: '' }))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput
        });
    });

    it('should handle invalid hash format', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid BLAKE3 hash format'
      });

      await expect(CatalogService.createImage({
        filename: 'test.jpg',
        blake3_hash: 'invalid',
        width: 1920,
        height: 1080
      }))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput
        });
    });

    it('should handle negative dimensions', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Image dimensions must be positive'
      });

      await expect(CatalogService.createImage({
        filename: 'test.jpg',
        blake3_hash: 'abc123',
        width: -100,
        height: 1080
      }))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput
        });
    });
  });

  describe('Database Locked Errors', () => {
    it('should handle database locked during read', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database is locked'
      });

      await expect(CatalogService.getAllImages())
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError,
          message: expect.stringContaining('locked')
        });
    });

    it('should handle database locked during write', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database is locked by another process'
      });

      await expect(CatalogService.updateImageState(1, { rating: 5 }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle transaction timeout', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Transaction timeout: database locked'
      });

      await expect(CatalogService.createCollection({ name: 'Test' }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle deadlock during concurrent operations', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Deadlock detected'
      });

      await expect(CatalogService.addImagesToCollection(1, [1, 2, 3]))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle busy database during search', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database busy: too many concurrent queries'
      });

      await expect(CatalogService.searchImages('test'))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });
  });

  describe('Constraint Violations', () => {
    it('should handle duplicate image hash', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'UNIQUE constraint failed: images.blake3_hash'
      });

      await expect(CatalogService.createImage({
        filename: 'duplicate.jpg',
        blake3_hash: 'existing-hash',
        width: 1920,
        height: 1080
      }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError,
          message: expect.stringContaining('constraint')
        });
    });

    it('should handle foreign key constraint violation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'FOREIGN KEY constraint failed'
      });

      await expect(CatalogService.addImagesToCollection(999, [1, 2, 3]))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle NOT NULL constraint violation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'NOT NULL constraint failed: images.filename'
      });

      await expect(CatalogService.createImage({
        filename: '',
        blake3_hash: 'abc123',
        width: 1920,
        height: 1080
      }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle CHECK constraint violation', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'CHECK constraint failed: rating must be 0-5'
      });

      await expect(CatalogService.updateImageState(1, { rating: 6 }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle duplicate collection name', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Collection name already exists'
      });

      await expect(CatalogService.createCollection({ name: 'Existing Collection' }))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });
  });

  describe('Query Errors', () => {
    it('should handle malformed search query', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid search query'
      });

      await expect(CatalogService.searchImages(''))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput
        });
    });

    it('should handle invalid filter parameters', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'InvalidInput',
        message: 'Invalid filter: unknown field'
      });

      await expect(CatalogService.getAllImages({ unknownField: 'value' } as any))
        .rejects.toMatchObject({
          type: CatalogErrorType.InvalidInput
        });
    });

    it('should handle corrupted database index', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Database index is corrupted'
      });

      await expect(CatalogService.searchImages('test'))
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });

    it('should handle query timeout', async () => {
      mockTauriInvoke.mockRejectedValue({
        type: 'Database',
        message: 'Query execution timeout'
      });

      await expect(CatalogService.getAllImages())
        .rejects.toMatchObject({
          type: CatalogErrorType.DatabaseError
        });
    });
  });
});

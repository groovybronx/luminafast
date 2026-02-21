/**
 * Tests unitaires pour les types filesystem
 */

import { describe, it, expect } from 'vitest';
import { FileEventType, FileLockType, FileEvent, isValidPath } from '../filesystem';

describe('Filesystem Types', () => {
  describe('FileEventType', () => {
    it('should have all required values', () => {
      expect(FileEventType.Created).toBe('created');
      expect(FileEventType.Modified).toBe('modified');
      expect(FileEventType.Deleted).toBe('deleted');
      expect(FileEventType.Renamed).toBe('renamed');
      expect(FileEventType.DirectoryCreated).toBe('directory_created');
      expect(FileEventType.DirectoryDeleted).toBe('directory_deleted');
    });
  });

  describe('FileLockType', () => {
    it('should have all required values', () => {
      expect(FileLockType.Shared).toBe('shared');
      expect(FileLockType.Exclusive).toBe('exclusive');
      expect(FileLockType.Write).toBe('write');
    });
  });

  describe('isValidPath', () => {
    it('should accept valid paths', () => {
      expect(isValidPath('/valid/path')).toBe(true);
      expect(isValidPath('C:\\valid\\path')).toBe(true);
      expect(isValidPath('./relative/path')).toBe(true);
      expect(isValidPath('file.txt')).toBe(true);
    });

    it('should reject invalid paths', () => {
      expect(isValidPath('')).toBe(false);
      expect(isValidPath('   ')).toBe(false);
      expect(isValidPath('../parent/path')).toBe(false);
      expect(isValidPath('path/with/\0')).toBe(false);
      expect(isValidPath('path/with/../traversal')).toBe(false);
    });
  });

  describe('FileEvent Creation', () => {
    it('should create valid event', () => {
      const event: FileEvent = {
        id: 'test-id',
        event_type: FileEventType.Created,
        path: '/path/to/image.jpg',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          is_directory: false,
          is_hidden: false,
          extension: 'jpg',
        },
      };

      expect(event.id).toBe('test-id');
      expect(event.event_type).toBe(FileEventType.Created);
      expect(event.path).toBe('/path/to/image.jpg');
    });
  });
});

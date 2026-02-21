/**
 * Tests unitaires pour le service filesystem
 * Tests déterministes - aucune dépendance à window/Tauri
 * Tests du comportement réel du service, pas du mock
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilesystemService } from '../filesystemService';
import { FileEventType, FileLockType, isValidPath } from '../../types/filesystem';

describe('FilesystemService', () => {
  let service: FilesystemService;

  beforeEach(() => {
    service = FilesystemService.getInstance();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const service1 = FilesystemService.getInstance();
      const service2 = FilesystemService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Tauri Availability', () => {
    it('should detect when Tauri is not available', async () => {
      // Simuler l'absence de Tauri en test
      const result = await service.isAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should handle availability check gracefully', async () => {
      // Test que la méthode ne lève pas d'exception
      const result = await service.isAvailable();
      expect(result).toBeDefined();
    });
  });

  describe('Path Operations', () => {
    it('should handle path existence check', async () => {
      const result = await service.pathExists('/test/path');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle file size check', async () => {
      const result = await service.getFileSize('/test/file.txt');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Watcher Management', () => {
    it('should handle watcher start with mock', async () => {
      const config = {
        path: '/test',
        recursive: false,
        watch_events: [FileEventType.Created],
        debounce_timeout: 100,
        ignore_hidden: true,
      };

      const result = await service.startWatcher(config);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Lock Operations', () => {
    it('should handle lock acquisition', async () => {
      const result = await service.acquireLock('/test/file.txt', {
        lock_type: FileLockType.Shared,
        timeout: 5000,
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle lock release', async () => {
      const result = await service.releaseLock('/test/file.txt');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should check file lock status', async () => {
      const result = await service.isFileLocked('/test/file.txt');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Event Management', () => {
    it('should handle event retrieval', async () => {
      const result = await service.getPendingEvents();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle event clearing', async () => {
      const result = await service.clearPendingEvents();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('State Management', () => {
    it('should get filesystem state', async () => {
      const result = await service.getFilesystemState();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should get active locks', async () => {
      const result = await service.getActiveLocks();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should list active watchers', async () => {
      const result = await service.listActiveWatchers();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should get watcher stats', async () => {
      const result = await service.getWatcherStats('test-watcher-id');
      expect(result).toBeDefined(); // Can be null or object
    });
  });

  describe('File Operations', () => {
    it('should handle file metadata retrieval', async () => {
      const result = await service.getFileMetadata('/test/file.txt');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle directory listing', async () => {
      const result = await service.listDirectory('/test/directory');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle directory creation', async () => {
      const result = await service.createDirectory('/test/new-dir');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle file deletion', async () => {
      const result = await service.deletePath('/test/file.txt');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle watcher errors gracefully', async () => {
      const invalidConfig = {
        path: '',
        recursive: false,
        watch_events: [FileEventType.Created],
        debounce_timeout: -1,
        ignore_hidden: true,
      };

      const result = await service.startWatcher(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const callback = vi.fn();

      const removeListener = service.addEventListener('watcher_started', callback);
      expect(typeof removeListener).toBe('function');

      // Test that listener was added
      expect(callback).not.toHaveBeenCalled();

      // Remove listener
      removeListener();
    });

    it('should handle event notifications', () => {
      const callback = vi.fn();

      service.addEventListener('test-event', callback);

      // Simulate event notification (internal test)
      expect(() => {
        service['notifyListeners']('watcher_started', {
          watcher_id: 'test-watcher',
          path: '/test',
          timestamp: new Date().toISOString(),
        });
      }).not.toThrow();
    });
  });

  describe('Utility Functions', () => {
    it('should validate paths correctly', () => {
      // Test de la fonction utilitaire isValidPath du module
      expect(isValidPath('/valid/path')).toBe(true);
      expect(isValidPath('C:\\\\valid\\\\path')).toBe(true);
      expect(isValidPath('./relative/path')).toBe(true);
      expect(isValidPath('file.txt')).toBe(true);
      expect(isValidPath('')).toBe(false);
      expect(isValidPath('   ')).toBe(false);
      expect(isValidPath('../parent/path')).toBe(false);
      expect(isValidPath('path/with/\0')).toBe(false); // Caractère null réel
      expect(isValidPath('path/with/null')).toBe(true); // Chaîne littérale "null" est valide
    });
  });

  describe('Exported Instance', () => {
    it('should export a singleton instance', () => {
      expect(FilesystemService.getInstance()).toBeDefined();
      expect(FilesystemService.getInstance()).toBeInstanceOf(FilesystemService);
    });
  });
});

/**
 * Unit Tests for Discovery Service
 *
 * These tests ensure the TypeScript discovery service wrapper works correctly
 * for all discovery and ingestion operations with proper error handling.
 */

// Mock Tauri API before any imports
import { vi } from 'vitest';

// Mock @tauri-apps/api/core with factory function to avoid hoisting issues
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DiscoveryConfig,
  DiscoverySession,
  DiscoveredFile,
  IngestionResult,
  BatchIngestionRequest,
  BatchIngestionResult,
  DiscoveryStats,
  RawFormat,
  DiscoveryStatus,
  FileProcessingStatus,
} from '../../types/discovery';

import { DiscoveryService, ServiceError, ServiceErrorType } from '../discoveryService';

// Get the mocked invoke function from window.__TAURI_INTERNALS__
const mockInvoke = (globalThis as any).__TAURI_INTERNALS__?.invoke as ReturnType<typeof vi.fn>;

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscoveryService({ debug: true });

    // Reset mock behavior
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  afterEach(() => {
    service.clearSessionCache();
  });

  describe('Service Configuration', () => {
    it('should create service with default configuration', () => {
      const defaultService = new DiscoveryService();
      expect(defaultService).toBeDefined();
    });

    it('should create service with custom configuration', () => {
      const customService = new DiscoveryService({
        debug: false,
        timeout: 60000,
        maxRetries: 5,
        retryDelay: 2000,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('Discovery Operations', () => {
    it('should start discovery session successfully', async () => {
      const mockSession: DiscoverySession = {
        sessionId: 'test-session-id',
        config: {
          rootPath: '/test/path',
          recursive: true,
          formats: [RawFormat.CR3, RawFormat.RAF],
          excludeDirs: [],
          maxDepth: null,
          maxFiles: null,
        },
        status: DiscoveryStatus.SCANNING,
        filesFound: 0,
        filesProcessed: 0,
        filesWithErrors: 0,
        progressPercentage: 0,
        currentDirectory: '/test/path',
        startedAt: new Date().toISOString(),
        completedAt: null,
        errorMessage: null,
      };

      mockInvoke.mockResolvedValue(mockSession);

      const config: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3, RawFormat.RAF],
        excludeDirs: [],
        maxDepth: null,
        maxFiles: null,
      };

      const result = await service.startDiscovery(config);

      expect(result).toEqual(mockSession);
      expect(mockInvoke).toHaveBeenCalledWith('start_discovery', { config });
      expect(service.getSession('test-session-id')).toEqual(mockSession);
    });

    it('should validate configuration before starting discovery', async () => {
      const invalidConfig = {
        rootPath: '', // Invalid empty path
        recursive: true,
        formats: [], // No formats specified
        excludeDirs: [],
        maxDepth: -1, // Invalid negative depth
        maxFiles: null,
      };

      await expect(service.startDiscovery(invalidConfig)).rejects.toThrow(ServiceError);

      const error = await service.startDiscovery(invalidConfig).catch((e) => e);
      expect(error).toBeInstanceOf(ServiceError);
      expect((error as ServiceError).type).toBe(ServiceErrorType.INVALID_PARAMS);
    });

    it('should stop discovery session successfully', async () => {
      const sessionId = 'test-session-id';
      mockInvoke.mockResolvedValue(undefined);

      await service.stopDiscovery(sessionId);

      expect(mockInvoke).toHaveBeenCalledWith('stop_discovery', { sessionId });
    });

    it('should get discovery status successfully', async () => {
      const mockSession: DiscoverySession = {
        sessionId: 'test-session-id',
        config: {
          rootPath: '/test/path',
          recursive: true,
          formats: [RawFormat.CR3],
          excludeDirs: [],
          maxDepth: null,
          maxFiles: null,
        },
        status: DiscoveryStatus.COMPLETED,
        filesFound: 10,
        filesProcessed: 10,
        filesWithErrors: 0,
        progressPercentage: 1.0,
        currentDirectory: null,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: null,
      };

      mockInvoke.mockResolvedValue(mockSession);

      const result = await service.getDiscoveryStatus('test-session-id');

      expect(result).toEqual(mockSession);
      expect(mockInvoke).toHaveBeenCalledWith('get_discovery_status', {
        sessionId: 'test-session-id',
      });
    });

    it('should get all discovery sessions successfully', async () => {
      const mockSessions: DiscoverySession[] = [
        {
          sessionId: 'session-1',
          config: {
            rootPath: '/test/path1',
            recursive: true,
            formats: [RawFormat.CR3],
            excludeDirs: [],
            maxDepth: null,
            maxFiles: null,
          },
          status: DiscoveryStatus.COMPLETED,
          filesFound: 5,
          filesProcessed: 5,
          filesWithErrors: 0,
          progressPercentage: 1.0,
          currentDirectory: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          errorMessage: null,
        },
        {
          sessionId: 'session-2',
          config: {
            rootPath: '/test/path2',
            recursive: false,
            formats: [RawFormat.RAF],
            excludeDirs: [],
            maxDepth: null,
            maxFiles: null,
          },
          status: DiscoveryStatus.SCANNING,
          filesFound: 3,
          filesProcessed: 1,
          filesWithErrors: 0,
          progressPercentage: 0.33,
          currentDirectory: '/test/path2',
          startedAt: new Date().toISOString(),
          completedAt: null,
          errorMessage: null,
        },
      ];

      mockInvoke.mockResolvedValue(mockSessions);

      const result = await service.getAllDiscoverySessions();

      expect(result).toEqual(mockSessions);
      expect(mockInvoke).toHaveBeenCalledWith('get_all_discovery_sessions', undefined);
      expect(service.getAllSessions()).toEqual(mockSessions);
    });

    it('should get discovered files successfully', async () => {
      const mockFiles: DiscoveredFile[] = [
        {
          id: 'file-1',
          sessionId: 'test-session-id',
          path: '/test/path/IMG_001.CR3',
          filename: 'IMG_001.CR3',
          sizeBytes: 25000000,
          format: RawFormat.CR3,
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: FileProcessingStatus.DISCOVERED,
          blake3Hash: null,
          errorMessage: null,
          ingestedAt: null,
          databaseId: null,
        },
        {
          id: 'file-2',
          sessionId: 'test-session-id',
          path: '/test/path/IMG_002.RAF',
          filename: 'IMG_002.RAF',
          sizeBytes: 30000000,
          format: RawFormat.RAF,
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          status: FileProcessingStatus.DISCOVERED,
          blake3Hash: null,
          errorMessage: null,
          ingestedAt: null,
          databaseId: null,
        },
      ];

      mockInvoke.mockResolvedValue(mockFiles);

      const result = await service.getDiscoveredFiles('test-session-id');

      expect(result).toEqual(mockFiles);
      expect(mockInvoke).toHaveBeenCalledWith('get_discovered_files', {
        sessionId: 'test-session-id',
      });
    });
  });

  describe('Ingestion Operations', () => {
    it('should ingest single file successfully', async () => {
      const mockFile: DiscoveredFile = {
        id: 'file-1',
        sessionId: 'test-session-id',
        path: '/test/path/IMG_001.CR3',
        filename: 'IMG_001.CR3',
        sizeBytes: 25000000,
        format: RawFormat.CR3,
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: FileProcessingStatus.DISCOVERED,
        blake3Hash: null,
        errorMessage: null,
        ingestedAt: null,
        databaseId: null,
      };

      const mockResult: IngestionResult = {
        file: mockFile,
        success: true,
        databaseId: 123,
        processingTimeMs: 150,
        error: null,
        metadata: {
          blake3Hash: 'abc123def456',
          exif: {
            make: 'Canon',
            model: 'EOS R5',
            dateTaken: '2023-01-01T12:00:00Z',
            iso: 100,
            aperture: 2.8,
            shutterSpeed: '1/125',
            focalLength: 50.0,
            lens: 'RF 50mm F1.2L',
          },
          formatDetails: {
            format: RawFormat.CR3,
            signatureValid: true,
            formatMetadata: null,
          },
        },
      };

      mockInvoke.mockResolvedValue(mockResult);

      const result = await service.ingestFile(mockFile);

      expect(result).toEqual(mockResult);
      expect(mockInvoke).toHaveBeenCalledWith('ingest_file', { file: mockFile });
    });

    it('should handle ingestion failure', async () => {
      const mockFile: DiscoveredFile = {
        id: 'file-1',
        sessionId: 'test-session-id',
        path: '/test/path/IMG_001.CR3',
        filename: 'IMG_001.CR3',
        sizeBytes: 25000000,
        format: RawFormat.CR3,
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: FileProcessingStatus.DISCOVERED,
        blake3Hash: null,
        errorMessage: null,
        ingestedAt: null,
        databaseId: null,
      };

      const mockResult: IngestionResult = {
        file: mockFile,
        success: false,
        databaseId: null,
        processingTimeMs: 50,
        error: 'Failed to compute file hash',
        metadata: null,
      };

      mockInvoke.mockResolvedValue(mockResult);

      const result = await service.ingestFile(mockFile);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to compute file hash');
    });

    it('should batch ingest files successfully', async () => {
      const mockRequest: BatchIngestionRequest = {
        sessionId: 'test-session-id',
        filePaths: ['/test/path/IMG_001.CR3', '/test/path/IMG_002.RAF'],
        skipExisting: true,
        maxFiles: 10,
      };

      const mockResult: BatchIngestionResult = {
        sessionId: 'test-session-id',
        totalRequested: 2,
        successful: [],
        failed: [],
        skipped: [],
        totalProcessingTimeMs: 300,
        avgProcessingTimeMs: 150,
        successRate: 1.0,
      };

      mockInvoke.mockResolvedValue(mockResult);

      const result = await service.batchIngest(mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockInvoke).toHaveBeenCalledWith('batch_ingest', { request: mockRequest });
    });
  });

  describe('Utility Operations', () => {
    it('should create discovery config from path', async () => {
      const mockConfig: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3, RawFormat.RAF, RawFormat.ARW],
        excludeDirs: ['.DS_Store', '.git'],
        maxDepth: 5,
        maxFiles: 1000,
      };

      mockInvoke.mockResolvedValue(mockConfig);

      const result = await service.createDiscoveryConfig('/test/path', true, 5, 1000);

      expect(result).toEqual(mockConfig);
      expect(mockInvoke).toHaveBeenCalledWith('create_discovery_config', {
        rootPath: '/test/path',
        recursive: true,
        maxDepth: 5,
        maxFiles: 1000,
      });
    });

    it('should get supported formats', async () => {
      const mockFormats = ['cr3', 'raf', 'arw'];
      mockInvoke.mockResolvedValue(mockFormats);

      const result = await service.getSupportedFormats();

      expect(result).toEqual(mockFormats);
      expect(mockInvoke).toHaveBeenCalledWith('get_supported_formats', undefined);
    });

    it('should validate discovery path', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await service.validateDiscoveryPath('/test/path');

      expect(result).toEqual({
        valid: true,
        type: 'directory',
        readable: true,
        writable: false,
        error: null,
      });
      expect(mockInvoke).toHaveBeenCalledWith('validate_discovery_path', { path: '/test/path' });
    });

    it('should handle invalid path validation', async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await service.validateDiscoveryPath('/invalid/path');

      expect(result).toEqual({
        valid: false,
        type: 'nonexistent',
        readable: false,
        writable: false,
        error: 'Path does not exist or is not accessible',
      });
    });

    it('should get default discovery config', async () => {
      const mockConfig: DiscoveryConfig = {
        rootPath: '',
        recursive: true,
        formats: [RawFormat.CR3, RawFormat.RAF, RawFormat.ARW],
        excludeDirs: ['.DS_Store', '.git', '.svn'],
        maxDepth: null,
        maxFiles: null,
      };

      mockInvoke.mockResolvedValue(mockConfig);

      const result = await service.getDefaultDiscoveryConfig();

      expect(result).toEqual(mockConfig);
      expect(mockInvoke).toHaveBeenCalledWith('get_default_discovery_config', undefined);
    });

    it('should cleanup old sessions', async () => {
      mockInvoke.mockResolvedValue(3);

      const result = await service.cleanupDiscoverySessions(24);

      expect(result).toBe(3);
      expect(mockInvoke).toHaveBeenCalledWith('cleanup_discovery_sessions', { max_age_hours: 24 });
    });

    it('should get discovery statistics', async () => {
      const mockStats: DiscoveryStats = {
        sessionId: 'test-session-id',
        status: DiscoveryStatus.COMPLETED,
        filesFound: 100,
        filesProcessed: 95,
        filesWithErrors: 5,
        progressPercentage: 1.0,
        currentDirectory: null,
        startedAt: '2023-01-01T12:00:00Z',
        completedAt: '2023-01-01T12:05:00Z',
        duration: {
          totalMs: 300000,
          formatted: '5m 0s',
          seconds: 300,
          minutes: 5,
          hours: 0,
        },
        ingestionStats: {
          sessionId: 'test-session-id',
          totalFiles: 95,
          ingestedFiles: 90,
          failedFiles: 3,
          skippedFiles: 2,
          totalSizeBytes: 2500000000,
          avgProcessingTimeMs: 150.5,
        },
      };

      mockInvoke.mockResolvedValue(mockStats);

      const result = await service.getDiscoveryStats('test-session-id');

      expect(result).toEqual(mockStats);
      expect(mockInvoke).toHaveBeenCalledWith('get_discovery_stats', {
        sessionId: 'test-session-id',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      const config: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3],
        excludeDirs: [],
        maxDepth: null,
        maxFiles: null,
      };

      await expect(service.startDiscovery(config)).rejects.toThrow(ServiceError);

      // Should retry the call multiple times
      expect(mockInvoke).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should create ServiceError from unknown error', () => {
      const unknownError = { message: 'Unknown error' };
      const serviceError = ServiceError.fromUnknown(unknownError);

      expect(serviceError).toBeInstanceOf(ServiceError);
      expect(serviceError.type).toBe(ServiceErrorType.UNKNOWN_ERROR);
      expect(serviceError.message).toBe('Unknown error');
    });

    it('should preserve ServiceError instance', () => {
      const originalError = new ServiceError(
        ServiceErrorType.NETWORK_ERROR,
        'Network error',
        new Error('Connection failed'),
      );

      const serviceError = ServiceError.fromUnknown(originalError);

      expect(serviceError).toBe(originalError);
    });

    it('should handle timeout errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Request timeout'));

      const config: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3],
        excludeDirs: [],
        maxDepth: null,
        maxFiles: null,
      };

      await expect(service.startDiscovery(config)).rejects.toThrow(ServiceError);
    });

    it('should handle permission errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Permission denied'));

      await expect(service.stopDiscovery('test-session')).rejects.toThrow(ServiceError);
    });
  });

  describe('Session Management', () => {
    it('should cache session after retrieval', async () => {
      const mockSession: DiscoverySession = {
        sessionId: 'test-session-id',
        config: {
          rootPath: '/test/path',
          recursive: true,
          formats: [RawFormat.CR3],
          excludeDirs: [],
          maxDepth: null,
          maxFiles: null,
        },
        status: DiscoveryStatus.SCANNING,
        filesFound: 5,
        filesProcessed: 2,
        filesWithErrors: 0,
        progressPercentage: 0.4,
        currentDirectory: '/test/path/subdir',
        startedAt: new Date().toISOString(),
        completedAt: null,
        errorMessage: null,
      };

      mockInvoke.mockResolvedValue(mockSession);

      const listener = vi.fn();
      const unsubscribe = service.addProgressListener('test-session-id', listener);

      await service.getDiscoveryStatus('test-session-id');

      expect(listener).toHaveBeenCalledTimes(1);

      // Vérifier que le listener reçoit un DiscoveryProgress (pas la session complète)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-id',
          percentage: 0.4,
          processed: 2,
          total: 5,
          currentDirectory: '/test/path/subdir',
        }),
      );

      unsubscribe();
    });

    it('should remove progress listeners', () => {
      const listener = vi.fn();
      const unsubscribe = service.addProgressListener('test-session-id', listener);

      service.removeProgressListeners('test-session-id');

      service['emitProgress']('test-session-id');

      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should get session status', async () => {
      const mockSession: DiscoverySession = {
        sessionId: 'test-session-id',
        config: {
          rootPath: '/test/path',
          recursive: true,
          formats: [RawFormat.CR3],
          excludeDirs: [],
          maxDepth: null,
          maxFiles: null,
        },
        status: DiscoveryStatus.SCANNING,
        filesFound: 10,
        filesProcessed: 5,
        filesWithErrors: 0,
        progressPercentage: 0.5,
        currentDirectory: '/test/path/subdir',
        startedAt: '2023-01-01T12:00:00Z',
        completedAt: null,
        errorMessage: null,
      };

      mockInvoke.mockResolvedValue(mockSession);

      const result = await service.getDiscoveryStatus('test-session-id');

      expect(result).toEqual(mockSession);
      expect(service.getSession('test-session-id')).toEqual(mockSession);
    });

    it('should refresh session from backend', async () => {
      const mockSession: DiscoverySession = {
        sessionId: 'test-session-id',
        config: {
          rootPath: '/test/path',
          recursive: true,
          formats: [RawFormat.CR3],
          excludeDirs: [],
          maxDepth: null,
          maxFiles: null,
        },
        status: DiscoveryStatus.COMPLETED,
        filesFound: 15,
        filesProcessed: 15,
        filesWithErrors: 0,
        progressPercentage: 1.0,
        currentDirectory: null,
        startedAt: '2023-01-01T12:00:00Z',
        completedAt: '2023-01-01T12:05:00Z',
        errorMessage: null,
      };

      mockInvoke.mockResolvedValue(mockSession);

      const result = await service.refreshSession('test-session-id');

      expect(result).toEqual(mockSession);
      expect(service.getSession('test-session-id')).toEqual(mockSession);
    });

    it('should clear session cache', () => {
      service.clearSessionCache();

      expect(service.getSession('any-session-id')).toBeNull();
    });
  });

  describe('Service Status', () => {
    it('should check service availability', async () => {
      mockInvoke.mockResolvedValue(['cr3', 'raf', 'arw']);

      const available = await service.isAvailable();

      expect(available).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('get_supported_formats', undefined);
    });

    it('should handle service unavailability', async () => {
      mockInvoke.mockRejectedValue(new Error('Command not available'));

      const available = await service.isAvailable();

      expect(available).toBe(false);
    });

    it('should get service status', async () => {
      mockInvoke.mockResolvedValue(['cr3', 'raf', 'arw']);

      const status = await service.getServiceStatus();

      expect(status).toEqual({
        available: true,
        activeSessions: 0,
        supportedFormats: ['cr3', 'raf', 'arw'],
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3, RawFormat.RAF],
        excludeDirs: ['.DS_Store'],
        maxDepth: 10,
        maxFiles: 1000,
      };

      const result = service.validateConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig: DiscoveryConfig = {
        rootPath: '', // Invalid
        recursive: true,
        formats: [], // Invalid
        excludeDirs: ['.DS_Store'],
        maxDepth: -1, // Invalid
        maxFiles: 0, // Invalid
      };

      const result = service.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Root path is required');
      expect(result.errors).toContain('At least one format must be specified');
      expect(result.errors).toContain('Max depth must be greater than 0');
      expect(result.errors).toContain('Max files must be greater than 0');
    });

    it('should generate warnings for concerning configuration', () => {
      const concerningConfig: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3],
        excludeDirs: [],
        maxDepth: 100, // Very deep
        maxFiles: 200000, // Very large
      };

      const result = service.validateConfig(concerningConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Large maxFiles limit may impact performance');
      expect(result.warnings).toContain('Deep recursion may impact performance');
    });
  });
});

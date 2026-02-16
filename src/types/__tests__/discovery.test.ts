/**
 * Unit Tests for Discovery Types
 * 
 * These tests ensure all discovery types work correctly with proper type safety,
 * serialization, and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  RawFormat,
  DiscoveryConfig,
  DiscoverySession,
  DiscoveredFile,
  IngestionResult,
  BatchIngestionRequest,
  BatchIngestionResult,
  DiscoveryStats,
  DiscoveryStatus,
  FileProcessingStatus,
  DiscoveryErrorType,
  DiscoveryError,
  DiscoveryProgress,
  PathValidationResult,
  ConfigValidationResult,
  DEFAULT_DISCOVERY_CONFIG,
} from '../discovery';
import {
  isRawFormat,
  isDiscoveryStatus,
  isFileProcessingStatus,
  getRawFormatInfo,
  formatFileSize,
  formatDuration,
  calculateSessionDuration,
} from '../discovery';

describe('Discovery Types', () => {
  describe('RawFormat', () => {
    it('should have correct enum values', () => {
      expect(RawFormat.CR3).toBe('cr3');
      expect(RawFormat.RAF).toBe('raf');
      expect(RawFormat.ARW).toBe('arw');
    });

    it('should identify valid RAW formats', () => {
      expect(isRawFormat('cr3')).toBe(true);
      expect(isRawFormat('raf')).toBe(true);
      expect(isRawFormat('arw')).toBe(true);
      expect(isRawFormat('jpg')).toBe(false);
      expect(isRawFormat('png')).toBe(false);
      expect(isRawFormat('')).toBe(false);
    });
  });

  describe('DiscoveryStatus', () => {
    it('should have correct enum values', () => {
      expect(DiscoveryStatus.IDLE).toBe('idle');
      expect(DiscoveryStatus.SCANNING).toBe('scanning');
      expect(DiscoveryStatus.PAUSED).toBe('paused');
      expect(DiscoveryStatus.COMPLETED).toBe('completed');
      expect(DiscoveryStatus.ERROR).toBe('error');
      expect(DiscoveryStatus.STOPPED).toBe('stopped');
    });

    it('should identify valid discovery statuses', () => {
      expect(isDiscoveryStatus('idle')).toBe(true);
      expect(isDiscoveryStatus('scanning')).toBe(true);
      expect(isDiscoveryStatus('completed')).toBe(true);
      expect(isDiscoveryStatus('invalid')).toBe(false);
    });
  });

  describe('FileProcessingStatus', () => {
    it('should have correct enum values', () => {
      expect(FileProcessingStatus.DISCOVERED).toBe('discovered');
      expect(FileProcessingStatus.PROCESSING).toBe('processing');
      expect(FileProcessingStatus.PROCESSED).toBe('processed');
      expect(FileProcessingStatus.ERROR).toBe('error');
      expect(FileProcessingStatus.SKIPPED).toBe('skipped');
    });

    it('should identify valid processing statuses', () => {
      expect(isFileProcessingStatus('discovered')).toBe(true);
      expect(isFileProcessingStatus('processed')).toBe(true);
      expect(isFileProcessingStatus('invalid')).toBe(false);
    });
  });

  describe('RawFormatInfo', () => {
    it('should return correct format information', () => {
      const cr3Info = getRawFormatInfo(RawFormat.CR3);
      expect(cr3Info.format).toBe(RawFormat.CR3);
      expect(cr3Info.extension).toBe('cr3');
      expect(cr3Info.mimeType).toBe('image/x-canon-cr3');
      expect(cr3Info.description).toBe('Canon RAW 3');
      expect(cr3Info.signature).toEqual([0x49, 0x52, 0x42, 0x02]);
      expect(cr3Info.minSize).toBe(1024 * 1024);
      expect(cr3Info.maxSize).toBe(1024 * 1024 * 1024);

      const rafInfo = getRawFormatInfo(RawFormat.RAF);
      expect(rafInfo.format).toBe(RawFormat.RAF);
      expect(rafInfo.extension).toBe('raf');
      expect(rafInfo.mimeType).toBe('image/x-fuji-raf');
      expect(rafInfo.description).toBe('Fujifilm RAW');
      expect(rafInfo.signature).toEqual([0x46, 0x55, 0x4A, 0x49]);

      const arwInfo = getRawFormatInfo(RawFormat.ARW);
      expect(arwInfo.format).toBe(RawFormat.ARW);
      expect(arwInfo.extension).toBe('arw');
      expect(arwInfo.mimeType).toBe('image/x-sony-arw');
      expect(arwInfo.description).toBe('Sony Alpha RAW');
      expect(arwInfo.signature).toEqual([0x00, 0x00, 0x02, 0x00]);
    });
  });

  describe('DiscoveryConfig', () => {
    it('should create valid configuration', () => {
      const config: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: true,
        formats: [RawFormat.CR3, RawFormat.RAF],
        excludeDirs: ['.DS_Store', '.git'],
        maxDepth: 5,
        maxFiles: 1000,
      };

      expect(config.rootPath).toBe('/test/path');
      expect(config.recursive).toBe(true);
      expect(config.formats).toHaveLength(2);
      expect(config.excludeDirs).toHaveLength(2);
      expect(config.maxDepth).toBe(5);
      expect(config.maxFiles).toBe(1000);
    });

    it('should handle null values', () => {
      const config: DiscoveryConfig = {
        rootPath: '/test/path',
        recursive: false,
        formats: [RawFormat.CR3],
        excludeDirs: [],
        maxDepth: null,
        maxFiles: null,
      };

      expect(config.maxDepth).toBeNull();
      expect(config.maxFiles).toBeNull();
    });

    it('should have correct default configuration', () => {
      expect(DEFAULT_DISCOVERY_CONFIG.rootPath).toBe('');
      expect(DEFAULT_DISCOVERY_CONFIG.recursive).toBe(true);
      expect(DEFAULT_DISCOVERY_CONFIG.formats).toEqual([RawFormat.CR3, RawFormat.RAF, RawFormat.ARW]);
      expect(DEFAULT_DISCOVERY_CONFIG.excludeDirs).toContain('.DS_Store');
      expect(DEFAULT_DISCOVERY_CONFIG.excludeDirs).toContain('.git');
      expect(DEFAULT_DISCOVERY_CONFIG.maxDepth).toBeNull();
      expect(DEFAULT_DISCOVERY_CONFIG.maxFiles).toBeNull();
    });
  });

  describe('DiscoverySession', () => {
    it('should create valid session', () => {
      const now = new Date().toISOString();
      const session: DiscoverySession = {
        sessionId: 'test-session-id',
        config: DEFAULT_DISCOVERY_CONFIG,
        status: DiscoveryStatus.SCANNING,
        filesFound: 10,
        filesProcessed: 5,
        filesWithErrors: 1,
        progressPercentage: 0.5,
        currentDirectory: '/test/path',
        startedAt: now,
        completedAt: null,
        errorMessage: null,
      };

      expect(session.sessionId).toBe('test-session-id');
      expect(session.status).toBe(DiscoveryStatus.SCANNING);
      expect(session.filesFound).toBe(10);
      expect(session.filesProcessed).toBe(5);
      expect(session.filesWithErrors).toBe(1);
      expect(session.progressPercentage).toBe(0.5);
      expect(session.currentDirectory).toBe('/test/path');
      expect(session.startedAt).toBe(now);
      expect(session.completedAt).toBeNull();
      expect(session.errorMessage).toBeNull();
    });

    it('should handle completed session', () => {
      const now = new Date().toISOString();
      const completedAt = new Date(Date.now() + 60000).toISOString(); // 1 minute later

      const session: DiscoverySession = {
        sessionId: 'test-session-id',
        config: DEFAULT_DISCOVERY_CONFIG,
        status: DiscoveryStatus.COMPLETED,
        filesFound: 10,
        filesProcessed: 10,
        filesWithErrors: 0,
        progressPercentage: 1.0,
        currentDirectory: null,
        startedAt: now,
        completedAt,
        errorMessage: null,
      };

      expect(session.status).toBe(DiscoveryStatus.COMPLETED);
      expect(session.progressPercentage).toBe(1.0);
      expect(session.currentDirectory).toBeNull();
      expect(session.completedAt).toBe(completedAt);
    });

    it('should handle error session', () => {
      const session: DiscoverySession = {
        sessionId: 'test-session-id',
        config: DEFAULT_DISCOVERY_CONFIG,
        status: DiscoveryStatus.ERROR,
        filesFound: 5,
        filesProcessed: 3,
        filesWithErrors: 2,
        progressPercentage: 0.6,
        currentDirectory: '/test/path',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: 'Permission denied',
      };

      expect(session.status).toBe(DiscoveryStatus.ERROR);
      expect(session.errorMessage).toBe('Permission denied');
      expect(session.completedAt).not.toBeNull();
    });
  });

  describe('DiscoveredFile', () => {
    it('should create valid discovered file', () => {
      const now = new Date().toISOString();
      const file: DiscoveredFile = {
        id: 'file-123',
        sessionId: 'session-456',
        path: '/test/path/IMG_001.CR3',
        filename: 'IMG_001.CR3',
        sizeBytes: 25000000,
        format: RawFormat.CR3,
        modifiedAt: now,
        createdAt: now,
        status: FileProcessingStatus.DISCOVERED,
        blake3Hash: null,
        errorMessage: null,
        ingestedAt: null,
        databaseId: null,
      };

      expect(file.id).toBe('file-123');
      expect(file.sessionId).toBe('session-456');
      expect(file.path).toBe('/test/path/IMG_001.CR3');
      expect(file.filename).toBe('IMG_001.CR3');
      expect(file.sizeBytes).toBe(25000000);
      expect(file.format).toBe(RawFormat.CR3);
      expect(file.status).toBe(FileProcessingStatus.DISCOVERED);
      expect(file.blake3Hash).toBeNull();
      expect(file.errorMessage).toBeNull();
      expect(file.ingestedAt).toBeNull();
      expect(file.databaseId).toBeNull();
    });

    it('should handle processed file', () => {
      const now = new Date().toISOString();
      const file: DiscoveredFile = {
        id: 'file-123',
        sessionId: 'session-456',
        path: '/test/path/IMG_001.CR3',
        filename: 'IMG_001.CR3',
        sizeBytes: 25000000,
        format: RawFormat.CR3,
        modifiedAt: now,
        createdAt: now,
        status: FileProcessingStatus.PROCESSED,
        blake3Hash: 'abc123def456',
        errorMessage: null,
        ingestedAt: now,
        databaseId: 789,
      };

      expect(file.status).toBe(FileProcessingStatus.PROCESSED);
      expect(file.blake3Hash).toBe('abc123def456');
      expect(file.ingestedAt).toBe(now);
      expect(file.databaseId).toBe(789);
    });
  });

  describe('IngestionResult', () => {
    it('should create successful ingestion result', () => {
      const file: DiscoveredFile = {
        id: 'file-123',
        sessionId: 'session-456',
        path: '/test/path/IMG_001.CR3',
        filename: 'IMG_001.CR3',
        sizeBytes: 25000000,
        format: RawFormat.CR3,
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: FileProcessingStatus.PROCESSED,
        blake3Hash: null,
        errorMessage: null,
        ingestedAt: null,
        databaseId: null,
      };

      const result: IngestionResult = {
        file,
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

      expect(result.success).toBe(true);
      expect(result.databaseId).toBe(123);
      expect(result.processingTimeMs).toBe(150);
      expect(result.error).toBeNull();
      expect(result.metadata).not.toBeNull();
      expect(result.metadata!.blake3Hash).toBe('abc123def456');
    });

    it('should create failed ingestion result', () => {
      const file: DiscoveredFile = {
        id: 'file-123',
        sessionId: 'session-456',
        path: '/test/path/IMG_001.CR3',
        filename: 'IMG_001.CR3',
        sizeBytes: 25000000,
        format: RawFormat.CR3,
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: FileProcessingStatus.ERROR,
        blake3Hash: null,
        errorMessage: null,
        ingestedAt: null,
        databaseId: null,
      };

      const result: IngestionResult = {
        file,
        success: false,
        databaseId: null,
        processingTimeMs: 50,
        error: 'Failed to compute file hash',
        metadata: null,
      };

      expect(result.success).toBe(false);
      expect(result.databaseId).toBeNull();
      expect(result.processingTimeMs).toBe(50);
      expect(result.error).toBe('Failed to compute file hash');
      expect(result.metadata).toBeNull();
    });
  });

  describe('BatchIngestionRequest', () => {
    it('should create valid batch request', () => {
      const request: BatchIngestionRequest = {
        sessionId: 'session-123',
        filePaths: ['/test/path/IMG_001.CR3', '/test/path/IMG_002.RAF'],
        skipExisting: true,
        maxFiles: 10,
      };

      expect(request.sessionId).toBe('session-123');
      expect(request.filePaths).toHaveLength(2);
      expect(request.skipExisting).toBe(true);
      expect(request.maxFiles).toBe(10);
    });

    it('should handle empty file paths', () => {
      const request: BatchIngestionRequest = {
        sessionId: 'session-123',
        filePaths: [],
        skipExisting: false,
        maxFiles: null,
      };

      expect(request.filePaths).toHaveLength(0);
      expect(request.skipExisting).toBe(false);
      expect(request.maxFiles).toBeNull();
    });
  });

  describe('BatchIngestionResult', () => {
    it('should create valid batch result', () => {
      const result: BatchIngestionResult = {
        sessionId: 'session-123',
        totalRequested: 5,
        successful: [],
        failed: [],
        skipped: [],
        totalProcessingTimeMs: 1000,
        avgProcessingTimeMs: 200,
        successRate: 1.0,
      };

      expect(result.sessionId).toBe('session-123');
      expect(result.totalRequested).toBe(5);
      expect(result.totalProcessingTimeMs).toBe(1000);
      expect(result.avgProcessingTimeMs).toBe(200);
      expect(result.successRate).toBe(1.0);
    });

    it('should handle partial success', () => {
      const result: BatchIngestionResult = {
        sessionId: 'session-123',
        totalRequested: 10,
        successful: [], // Would contain successful results
        failed: [], // Would contain failed results
        skipped: [], // Would contain skipped results
        totalProcessingTimeMs: 2000,
        avgProcessingTimeMs: 200,
        successRate: 0.8,
      };

      expect(result.successRate).toBe(0.8);
      expect(result.totalRequested).toBe(10);
    });
  });

  describe('DiscoveryStats', () => {
    it('should create valid statistics', () => {
      const stats: DiscoveryStats = {
        sessionId: 'session-123',
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
          sessionId: 'session-123',
          totalFiles: 95,
          ingestedFiles: 90,
          failedFiles: 3,
          skippedFiles: 2,
          totalSizeBytes: 2500000000,
          avgProcessingTimeMs: 150.5,
        },
      };

      expect(stats.sessionId).toBe('session-123');
      expect(stats.status).toBe(DiscoveryStatus.COMPLETED);
      expect(stats.filesFound).toBe(100);
      expect(stats.filesProcessed).toBe(95);
      expect(stats.filesWithErrors).toBe(5);
      expect(stats.progressPercentage).toBe(1.0);
      expect(stats.duration).not.toBeNull();
      expect(stats.duration!.totalMs).toBe(300000);
      expect(stats.ingestionStats.totalFiles).toBe(95);
    });
  });

  describe('DiscoveryError', () => {
    it('should create valid error', () => {
      const error: DiscoveryError = {
        type: DiscoveryErrorType.IO_ERROR,
        message: 'Failed to read directory',
        path: '/test/path',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
        stack: null,
      };

      expect(error.type).toBe(DiscoveryErrorType.IO_ERROR);
      expect(error.message).toBe('Failed to read directory');
      expect(error.path).toBe('/test/path');
      expect(error.sessionId).toBe('session-123');
      expect(error.timestamp).not.toBeNull();
    });
  });

  describe('DiscoveryProgress', () => {
    it('should create valid progress', () => {
      const progress: DiscoveryProgress = {
        sessionId: 'session-123',
        percentage: 0.75,
        processed: 75,
        total: 100,
        currentDirectory: '/test/path/subdir',
        etaSeconds: 25,
        processingRate: 2.5,
      };

      expect(progress.sessionId).toBe('session-123');
      expect(progress.percentage).toBe(0.75);
      expect(progress.processed).toBe(75);
      expect(progress.total).toBe(100);
      expect(progress.currentDirectory).toBe('/test/path/subdir');
      expect(progress.etaSeconds).toBe(25);
      expect(progress.processingRate).toBe(2.5);
    });

    it('should handle null values', () => {
      const progress: DiscoveryProgress = {
        sessionId: 'session-123',
        percentage: 0.0,
        processed: 0,
        total: 0,
        currentDirectory: null,
        etaSeconds: null,
        processingRate: null,
      };

      expect(progress.currentDirectory).toBeNull();
      expect(progress.etaSeconds).toBeNull();
      expect(progress.processingRate).toBeNull();
    });
  });

  describe('PathValidationResult', () => {
    it('should create valid validation result', () => {
      const result: PathValidationResult = {
        valid: true,
        type: 'directory',
        readable: true,
        writable: false,
        error: null,
      };

      expect(result.valid).toBe(true);
      expect(result.type).toBe('directory');
      expect(result.readable).toBe(true);
      expect(result.writable).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should create invalid validation result', () => {
      const result: PathValidationResult = {
        valid: false,
        type: 'nonexistent',
        readable: false,
        writable: false,
        error: 'Path does not exist',
      };

      expect(result.valid).toBe(false);
      expect(result.type).toBe('nonexistent');
      expect(result.readable).toBe(false);
      expect(result.writable).toBe(false);
      expect(result.error).toBe('Path does not exist');
    });
  });

  describe('ConfigValidationResult', () => {
    it('should create valid validation result', () => {
      const result: ConfigValidationResult = {
        valid: true,
        errors: [],
        warnings: ['Large maxFiles limit may impact performance'],
      };

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
    });

    it('should create invalid validation result', () => {
      const result: ConfigValidationResult = {
        valid: false,
        errors: ['Root path is required', 'No formats specified'],
        warnings: [],
      };

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(1099511627776)).toBe('1.0 TB');
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
      expect(formatFileSize(1)).toBe('1.0 B');
      expect(formatFileSize(1023)).toBe('1023.0 B');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
      expect(formatDuration(7200000)).toBe('2h 0m 0s');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(500)).toBe('0s');
      expect(formatDuration(999)).toBe('0s');
    });
  });

  describe('calculateSessionDuration', () => {
    it('should calculate duration for completed session', () => {
      const session: DiscoverySession = {
        sessionId: 'test-session',
        config: DEFAULT_DISCOVERY_CONFIG,
        status: DiscoveryStatus.COMPLETED,
        filesFound: 10,
        filesProcessed: 10,
        filesWithErrors: 0,
        progressPercentage: 1.0,
        currentDirectory: null,
        startedAt: '2023-01-01T12:00:00.000Z',
        completedAt: '2023-01-01T12:05:30.000Z',
        errorMessage: null,
      };

      const duration = calculateSessionDuration(session);

      expect(duration).not.toBeNull();
      expect(duration!.totalMs).toBe(330000); // 5 minutes 30 seconds
      expect(duration!.formatted).toBe('5m 30s');
      expect(duration!.seconds).toBe(330);
      expect(duration!.minutes).toBe(5);
      expect(duration!.hours).toBe(0);
    });

    it('should return null for incomplete session', () => {
      const session: DiscoverySession = {
        sessionId: 'test-session',
        config: DEFAULT_DISCOVERY_CONFIG,
        status: DiscoveryStatus.SCANNING,
        filesFound: 5,
        filesProcessed: 2,
        filesWithErrors: 0,
        progressPercentage: 0.4,
        currentDirectory: '/test/path',
        startedAt: '2023-01-01T12:00:00.000Z',
        completedAt: null,
        errorMessage: null,
      };

      const duration = calculateSessionDuration(session);

      expect(duration).toBeNull();
    });

    it('should handle very short durations', () => {
      const session: DiscoverySession = {
        sessionId: 'test-session',
        config: DEFAULT_DISCOVERY_CONFIG,
        status: DiscoveryStatus.COMPLETED,
        filesFound: 1,
        filesProcessed: 1,
        filesWithErrors: 0,
        progressPercentage: 1.0,
        currentDirectory: null,
        startedAt: '2023-01-01T12:00:00.000Z',
        completedAt: '2023-01-01T12:00:00.100Z', // 100ms
        errorMessage: null,
      };

      const duration = calculateSessionDuration(session);

      expect(duration).not.toBeNull();
      expect(duration!.totalMs).toBe(100);
      expect(duration!.formatted).toBe('0s');
      expect(duration!.seconds).toBe(0);
    });
  });
});

describe('Type Safety', () => {
  it('should enforce type constraints', () => {
    // These should compile without errors
    const validFormat: RawFormat = RawFormat.CR3;
    const validStatus: DiscoveryStatus = DiscoveryStatus.SCANNING;
    const validProcessingStatus: FileProcessingStatus = FileProcessingStatus.DISCOVERED;

    expect(validFormat).toBeDefined();
    expect(validStatus).toBeDefined();
    expect(validProcessingStatus).toBeDefined();

    // Type guards should work correctly
    if (isRawFormat('cr3')) {
      const format: RawFormat = RawFormat.CR3; // This should be valid
      expect(format).toBe(RawFormat.CR3);
    }

    if (isDiscoveryStatus('scanning')) {
      const status: DiscoveryStatus = DiscoveryStatus.SCANNING; // This should be valid
      expect(status).toBe(DiscoveryStatus.SCANNING);
    }

    if (isFileProcessingStatus('discovered')) {
      const status: FileProcessingStatus = FileProcessingStatus.DISCOVERED; // This should be valid
      expect(status).toBe(FileProcessingStatus.DISCOVERED);
    }
  });

  it('should prevent invalid assignments', () => {
    // These should cause TypeScript errors if uncommented:
    // const invalidFormat: RawFormat = 'invalid';
    // const invalidStatus: DiscoveryStatus = 'invalid';
    // const invalidProcessingStatus: FileProcessingStatus = 'invalid';

    // But we can test the type guards return false for invalid values
    expect(isRawFormat('invalid')).toBe(false);
    expect(isDiscoveryStatus('invalid')).toBe(false);
    expect(isFileProcessingStatus('invalid')).toBe(false);
  });
});

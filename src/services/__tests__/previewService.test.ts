import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreviewService } from '@/services/previewService';
import { PreviewType, PreviewProgressEvent } from '@/types';

// Mock Tauri internals
const mockTauriInvoke = vi.fn();
const mockUnlisten = vi.fn();
const mockListen = vi.fn(() => Promise.resolve(mockUnlisten));

// Setup global mock with event system
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: mockTauriInvoke,
    event: {
      listen: mockListen,
    },
  },
  writable: true,
});

// Mock Tauri event system (for compatibility)
vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}));

describe('PreviewService', () => {
  let service: PreviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (PreviewService as any).instance = null;
    service = PreviewService.getInstance();
    // Reset Tauri availability state
    service['isTauriAvailable'] = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PreviewService.getInstance();
      const instance2 = PreviewService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create only one instance', () => {
      const service1 = PreviewService.getInstance();
      const service2 = new (PreviewService as any)();
      expect(service1).not.toBe(service2);
    });
  });

  describe('initialize', () => {
    it('should initialize the service successfully', async () => {
      mockTauriInvoke.mockResolvedValue(undefined);

      await service.initialize();

      // Should call availability check first, then init
      expect(mockTauriInvoke).toHaveBeenCalledTimes(2);
      expect(mockTauriInvoke).toHaveBeenNthCalledWith(1, 'get_preview_cache_info', {});
      expect(mockTauriInvoke).toHaveBeenNthCalledWith(2, 'init_preview_service', {});
      expect(service['isInitialized']).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockTauriInvoke.mockResolvedValue(undefined);

      await service.initialize();
      await service.initialize(); // Second call

      // Should call availability check once, then init once (second initialize returns early)
      expect(mockTauriInvoke).toHaveBeenCalledTimes(2);
    });

    it('should handle initialization error', async () => {
      const error = new Error('Initialization failed');
      mockTauriInvoke.mockRejectedValue(error);

      await expect(service.initialize()).rejects.toMatchObject({
        type: 'processing_error',
        message: 'Tauri not available for command: init_preview_service',
      });

      expect(service['isInitialized']).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is available', async () => {
      mockTauriInvoke.mockResolvedValue({
        total_previews: 10,
        total_size: 1024,
        thumbnail_count: 5,
        preview_count: 5,
        last_cleanup: null,
      });

      // Initialize service first since getCacheInfo requires it
      await service.initialize();
      // Clear mocks to only track availability check calls
      mockTauriInvoke.mockClear();
      mockTauriInvoke.mockResolvedValue({
        total_previews: 10,
        total_size: 1024,
        thumbnail_count: 5,
        preview_count: 5,
        last_cleanup: null,
      });

      const result = await service.isAvailable();

      expect(result).toBe(true);
      // Should call availability check (cached from init), then actual getCacheInfo
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1);
      expect(mockTauriInvoke).toHaveBeenCalledWith('get_preview_cache_info', {});
    });

    it('should return false when service is not available', async () => {
      mockTauriInvoke.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('generatePreview', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should generate a preview successfully', async () => {
      const mockResult = {
        path: '/path/to/preview.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 1024,
        generation_time: 100,
        source_hash: 'abc123',
        generated_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockResult);

      const result = await service.generatePreview('/path/to/image.jpg', PreviewType.Thumbnail, 'abc123');

      expect(mockTauriInvoke).toHaveBeenCalledWith('generate_preview', {
        filePath: '/path/to/image.jpg',
        previewType: PreviewType.Thumbnail,
        sourceHash: 'abc123',
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw error when service not initialized', async () => {
      const uninitializedService = new (PreviewService as any)();
      
      await expect(uninitializedService.generatePreview('/path/to/image.jpg', PreviewType.Thumbnail, 'abc123'))
        .rejects.toThrow('PreviewService non initialisé');
    });

    it('should handle unsupported format error', async () => {
      const error = new Error('Unsupported format: RAW');
      mockTauriInvoke.mockRejectedValue(error);

      await expect(service.generatePreview('/path/to/image.raw', PreviewType.Thumbnail, 'abc123'))
        .rejects.toMatchObject({
          type: 'unsupported_format',
          format: 'Unsupported format: RAW',
        });
    });

    it('should handle corrupted file error', async () => {
      const error = new Error('File corrupted or not found');
      mockTauriInvoke.mockRejectedValue(error);

      await expect(service.generatePreview('/path/to/corrupted.jpg', PreviewType.Thumbnail, 'abc123'))
        .rejects.toMatchObject({
          type: 'corrupted_file',
          path: 'File corrupted or not found',
        });
    });

    it('should handle timeout error', async () => {
      const error = new Error('Generation timeout');
      mockTauriInvoke.mockRejectedValue(error);

      await expect(service.generatePreview('/path/to/large.jpg', PreviewType.OneToOne, 'abc123'))
        .rejects.toMatchObject({
          type: 'generation_timeout',
          timeout: 30,
        });
    });

    it('should handle out of memory error', async () => {
      const error = new Error('Out of memory');
      mockTauriInvoke.mockRejectedValue(error);

      await expect(service.generatePreview('/path/to/huge.jpg', PreviewType.OneToOne, 'abc123'))
        .rejects.toMatchObject({
          type: 'out_of_memory',
        });
    });

    it('should handle IO error', async () => {
      const error = new Error('IO error: Permission denied');
      mockTauriInvoke.mockRejectedValue(error);

      await expect(service.generatePreview('/protected/image.jpg', PreviewType.Thumbnail, 'abc123'))
        .rejects.toMatchObject({
          type: 'io_error',
          message: 'IO error: Permission denied',
        });
    });
  });

  describe('generateBatchPreviews', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should generate batch previews successfully', async () => {
      const files = [
        { path: '/path/to/image1.jpg', hash: 'hash1' },
        { path: '/path/to/image2.jpg', hash: 'hash2' },
      ];

      const mockStats = {
        batch_id: 'batch-123',
        total_files: 2,
        successful_count: 2,
        failed_count: 0,
        skipped_count: 0,
        total_duration: 200,
        avg_time_per_file: 100,
        started_at: '2026-02-18T00:00:00Z',
        completed_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockStats);

      const result = await service.generateBatchPreviews(files, PreviewType.Thumbnail);

      expect(mockTauriInvoke).toHaveBeenCalledWith('generate_batch_previews', {
        files: [['/path/to/image1.jpg', 'hash1'], ['/path/to/image2.jpg', 'hash2']],
        previewType: PreviewType.Thumbnail,
      });
      expect(result).toEqual(mockStats);
    });

    it('should handle empty batch', async () => {
      const mockStats = {
        batch_id: 'batch-empty',
        total_files: 0,
        successful_count: 0,
        failed_count: 0,
        skipped_count: 0,
        total_duration: 0,
        avg_time_per_file: 0,
        started_at: '2026-02-18T00:00:00Z',
        completed_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockStats);

      const result = await service.generateBatchPreviews([], PreviewType.Thumbnail);

      expect(result.total_files).toBe(0);
    });
  });

  describe('generatePreviewPyramid', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should generate full pyramid with all types', async () => {
      const mockPreviewResult = {
        path: '/path/to/preview.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 1024,
        generation_time: 100,
        source_hash: 'abc123',
        generated_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockPreviewResult);

      const result = await service.generatePreviewPyramid('/path/to/image.jpg', 'abc123');

      // 3 preview calls + 1 availability check + 1 initialization = 5 total calls
      expect(mockTauriInvoke).toHaveBeenCalledTimes(5);
      expect(result.results).toHaveLength(3);
      expect(result.source_hash).toBe('abc123');
      expect(result.total_generation_time).toBeGreaterThanOrEqual(0);
      expect(result.generated_at).toBeDefined();
    });

    it('should generate specific types only', async () => {
      const mockPreviewResult = {
        path: '/path/to/preview.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 1024,
        generation_time: 100,
        source_hash: 'abc123',
        generated_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockPreviewResult);

      const options = {
        generate_all: false,
        preview_types: [PreviewType.Thumbnail, PreviewType.Standard],
        force_regenerate: false,
        emit_progress: false,
      };

      const result = await service.generatePreviewPyramid('/path/to/image.jpg', 'abc123', options);

      // 2 preview calls + 1 availability check + 1 initialization = 4 total calls
      expect(mockTauriInvoke).toHaveBeenCalledTimes(4);
      expect(result.results).toHaveLength(2);
    });

    it('should use default options when none provided', async () => {
      const mockPreviewResult = {
        path: '/path/to/preview.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 1024,
        generation_time: 100,
        source_hash: 'abc123',
        generated_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockPreviewResult);

      await service.generatePreviewPyramid('/path/to/image.jpg', 'abc123');

      // 3 preview calls + 1 availability check + 1 initialization = 5 total calls
      expect(mockTauriInvoke).toHaveBeenCalledTimes(5);
    });
  });

  describe('isPreviewCached', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should check if preview is cached', async () => {
      mockTauriInvoke.mockResolvedValue(true);

      const result = await service.isPreviewCached('abc123', PreviewType.Thumbnail);

      expect(mockTauriInvoke).toHaveBeenCalledWith('is_preview_cached', {
        sourceHash: 'abc123',
        previewType: PreviewType.Thumbnail,
      });
      expect(result).toBe(true);
    });

    it('should return false when preview not cached', async () => {
      mockTauriInvoke.mockResolvedValue(false);

      const result = await service.isPreviewCached('def456', PreviewType.Standard);

      expect(result).toBe(false);
    });
  });

  describe('getPreviewPath', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should return preview path when exists', async () => {
      mockTauriInvoke.mockResolvedValue('/path/to/preview.jpg');

      const result = await service.getPreviewPath('abc123', PreviewType.Thumbnail);

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_preview_path', {
        sourceHash: 'abc123',
        previewType: PreviewType.Thumbnail,
      });
      expect(result).toBe('/path/to/preview.jpg');
    });

    it('should return null when preview does not exist', async () => {
      mockTauriInvoke.mockResolvedValue(null);

      const result = await service.getPreviewPath('def456', PreviewType.Standard);

      expect(result).toBeNull();
    });
  });

  describe('getCacheInfo', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should return cache information', async () => {
      const mockCacheInfo = {
        total_previews: 100,
        total_size: 10 * 1024 * 1024, // 10MB
        thumbnail_count: 60,
        preview_count: 40,
        last_cleanup: '2026-02-17T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockCacheInfo);

      const result = await service.getCacheInfo();

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_preview_cache_info', {});
      expect(result).toEqual(mockCacheInfo);
    });
  });

  describe('cleanupCache', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should cleanup cache with default config', async () => {
      mockTauriInvoke.mockResolvedValue(undefined);

      await service.cleanupCache();

      expect(mockTauriInvoke).toHaveBeenCalledWith('cleanup_preview_cache', {
        max_cache_size: 2 * 1024 * 1024 * 1024, // 2GB
        max_age_days: 30,
        max_previews_per_type: 10000,
      });
    });

    it('should cleanup cache with custom config', async () => {
      mockTauriInvoke.mockResolvedValue(undefined);

      const customConfig = {
        max_cache_size: 1024 * 1024 * 1024, // 1GB
        max_age_days: 15,
      };

      await service.cleanupCache(customConfig);

      expect(mockTauriInvoke).toHaveBeenCalledWith('cleanup_preview_cache', {
        max_cache_size: 1024 * 1024 * 1024,
        max_age_days: 15,
        max_previews_per_type: 10000, // Default value
      });
    });
  });

  describe('removePreview', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should remove preview from cache', async () => {
      mockTauriInvoke.mockResolvedValue(undefined);

      await service.removePreview('abc123', PreviewType.Thumbnail);

      expect(mockTauriInvoke).toHaveBeenCalledWith('remove_preview', {
        sourceHash: 'abc123',
        previewType: PreviewType.Thumbnail,
      });
    });
  });

  describe('generatePreviewsWithProgress', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should generate previews with progress events', async () => {
      const files = [
        { path: '/path/to/image1.jpg', hash: 'hash1' },
        { path: '/path/to/image2.jpg', hash: 'hash2' },
      ];

      const mockStats = {
        batch_id: 'batch-progress',
        total_files: 2,
        successful_count: 2,
        failed_count: 0,
        skipped_count: 0,
        total_duration: 200,
        avg_time_per_file: 100,
        started_at: '2026-02-18T00:00:00Z',
        completed_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockStats);

      const result = await service.generatePreviewsWithProgress(
        files,
        [PreviewType.Thumbnail, PreviewType.Standard]
      );

      expect(mockTauriInvoke).toHaveBeenCalledWith('generate_previews_with_progress', {
        files: [['/path/to/image1.jpg', 'hash1'], ['/path/to/image2.jpg', 'hash2']],
        previewTypes: [PreviewType.Thumbnail, PreviewType.Standard],
      });
      expect(result).toEqual(mockStats);
    });
  });

  describe('benchmarkPerformance', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should run performance benchmark', async () => {
      const mockResults = [
        {
          path: '/path/to/preview1.jpg',
          preview_type: PreviewType.Thumbnail,
          size: [240, 180],
          file_size: 1024,
          generation_time: 95,
          source_hash: 'abc123',
          generated_at: '2026-02-18T00:00:00Z',
        },
        {
          path: '/path/to/preview2.jpg',
          preview_type: PreviewType.Thumbnail,
          size: [240, 180],
          file_size: 1024,
          generation_time: 105,
          source_hash: 'abc123',
          generated_at: '2026-02-18T00:00:00Z',
        },
      ];

      mockTauriInvoke.mockResolvedValue(mockResults);

      const result = await service.benchmarkPerformance('/path/to/test.jpg', 2);

      expect(mockTauriInvoke).toHaveBeenCalledWith('benchmark_preview_generation', {
        testFile: '/path/to/test.jpg',
        iterations: 2,
      });
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockResults);
    });

    it('should use default iterations', async () => {
      mockTauriInvoke.mockResolvedValue([]);

      await service.benchmarkPerformance('/path/to/test.jpg');

      expect(mockTauriInvoke).toHaveBeenCalledWith('benchmark_preview_generation', {
        testFile: '/path/to/test.jpg',
        iterations: 10, // Default value
      });
    });
  });

  describe('getConfig', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should get current configuration', async () => {
      const mockConfig = {
        catalog_dir: '/path/to/catalog',
        parallel_threads: 4,
        generation_timeout: 30,
        use_libvips: true,
      };

      mockTauriInvoke.mockResolvedValue(mockConfig);

      const result = await service.getConfig();

      expect(mockTauriInvoke).toHaveBeenCalledWith('get_preview_config', {});
      expect(result).toEqual(mockConfig);
    });
  });

  describe('onProgress', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should register progress callback and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = service.onProgress(callback);

      expect(typeof unsubscribe).toBe('function');
      expect(service['progressListeners'].size).toBe(1);

      // Test unsubscribe
      unsubscribe();
      expect(service['progressListeners'].size).toBe(0);
    });

    it('should handle multiple progress listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = service.onProgress(callback1);
      const unsubscribe2 = service.onProgress(callback2);

      expect(service['progressListeners'].size).toBe(2);

      unsubscribe1();
      expect(service['progressListeners'].size).toBe(1);

      unsubscribe2();
      expect(service['progressListeners'].size).toBe(0);
    });
  });

  describe('Event Listeners', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      vi.clearAllMocks();
      // Reset singleton to test event listener setup
      (PreviewService as any).instance = null;
    });

    it('should setup event listeners on construction', async () => {
      // Create new service instance
      const newService = PreviewService.getInstance();
      
      // Wait for async event listener setup
      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalledWith('preview_progress', expect.any(Function));
      });
      
      // Verify unlisten function is stored
      expect(newService['unlistenFunctions'].length).toBeGreaterThan(0);
    });

    it('should handle progress events and call all callbacks', async () => {
      const newService = PreviewService.getInstance();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Register callbacks
      newService.onProgress(callback1);
      newService.onProgress(callback2);

      // Wait for event listener to be set up
      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      // Get the event handler that was registered (using any to handle mock typing)
      const mockCalls = mockListen.mock.calls as unknown[];
      const eventHandler = mockCalls[0]?.[1] as ((event: { payload: PreviewProgressEvent }) => void) | undefined;
      expect(eventHandler).toBeDefined();

      // Simulate event from Tauri
      const mockEvent = {
        payload: {
          type: 'preview_type_started' as const,
          preview_type: PreviewType.Thumbnail,
          current: 1,
          total: 10,
        },
      };

      eventHandler!(mockEvent);

      // Both callbacks should be called
      expect(callback1).toHaveBeenCalledWith(mockEvent.payload);
      expect(callback2).toHaveBeenCalledWith(mockEvent.payload);
    });

    it('should handle callback errors gracefully', async () => {
      const newService = PreviewService.getInstance();
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      newService.onProgress(errorCallback);
      newService.onProgress(normalCallback);

      // Wait for event listener to be set up
      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      // Get the event handler (using any to handle mock typing)
      const mockCalls = mockListen.mock.calls as unknown[];
      const eventHandler = mockCalls[0]?.[1] as ((event: { payload: PreviewProgressEvent }) => void) | undefined;
      expect(eventHandler).toBeDefined();

      // Simulate event - should not throw even if callback errors
      const mockEvent = {
        payload: {
          type: 'batch_completed' as const,
        },
      };

      // Should not throw
      expect(() => eventHandler!(mockEvent)).not.toThrow();

      // Error callback should have been called (and errored)
      expect(errorCallback).toHaveBeenCalled();
      // Normal callback should still be called despite error in first callback
      expect(normalCallback).toHaveBeenCalledWith(mockEvent.payload);
    });

    it('should cleanup event listeners on dispose', async () => {
      const newService = PreviewService.getInstance();

      // Wait for event listener to be set up
      await vi.waitFor(() => {
        expect(mockListen).toHaveBeenCalled();
      });

      const callback = vi.fn();
      newService.onProgress(callback);

      expect(newService['progressListeners'].size).toBe(1);

      // Dispose service
      newService.dispose();

      // Should call unlisten
      expect(mockUnlisten).toHaveBeenCalled();
      // Should clear progress listeners
      expect(newService['progressListeners'].size).toBe(0);
      // Should clear unlisten functions
      expect(newService['unlistenFunctions'].length).toBe(0);
    });
  });

  describe('Static Utility Methods', () => {
    it('should create default pyramid options', () => {
      const options = PreviewService.createDefaultPyramidOptions();

      expect(options).toEqual({
        generate_all: true,
        force_regenerate: false,
        emit_progress: true,
      });
    });

    it('should create default cleanup config', () => {
      const config = PreviewService.createDefaultCleanupConfig();

      expect(config).toEqual({
        max_cache_size: 2 * 1024 * 1024 * 1024, // 2GB
        max_age_days: 30,
        max_previews_per_type: 10000,
        cleanup_interval_hours: 24,
      });
    });
  });

  describe('Error Handling - createErrorFromUnknown', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should convert Error with unsupported format message', () => {
      const error = new Error('Unsupported format: CR2');
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'unsupported_format',
        format: 'Unsupported format: CR2',
      });
    });

    it('should convert Error with corrupted file message', () => {
      const error = new Error('File corrupted or not found');
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'corrupted_file',
        path: 'File corrupted or not found',
      });
    });

    it('should convert Error with timeout message', () => {
      const error = new Error('Generation timeout occurred');
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'generation_timeout',
        timeout: 30,
      });
    });

    it('should convert Error with memory message', () => {
      const error = new Error('Out of memory error');
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'out_of_memory',
      });
    });

    it('should convert Error with IO message', () => {
      const error = new Error('IO error: Disk full');
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'io_error',
        message: 'IO error: Disk full',
      });
    });

    it('should convert generic Error', () => {
      const error = new Error('Some other error');
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'processing_error',
        message: 'Some other error',
      });
    });

    it('should convert non-Error object', () => {
      const error = 'String error';
      const result = service['createErrorFromUnknown'](error);

      expect(result).toMatchObject({
        type: 'processing_error',
        message: 'String error',
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      mockTauriInvoke.mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should handle empty file paths gracefully', async () => {
      const mockResult = {
        path: '/path/to/preview.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 1024,
        generation_time: 100,
        source_hash: '',
        generated_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockResult);

      const result = await service.generatePreview('', PreviewType.Thumbnail, '');

      expect(result.source_hash).toBe('');
    });

    it('should handle very long file paths', async () => {
      const longPath = '/very/long/path/that/exceeds/normal/filesystem/limits/and/contains/many/directories/and/long/filename/with/extension.jpg';
      const mockResult = {
        path: '/path/to/preview.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 1024,
        generation_time: 100,
        source_hash: 'abc123',
        generated_at: '2026-02-18T00:00:00Z',
      };

      mockTauriInvoke.mockResolvedValue(mockResult);

      const result = await service.generatePreview(longPath, PreviewType.Thumbnail, 'abc123');

      expect(mockTauriInvoke).toHaveBeenCalledWith('generate_preview', {
        filePath: longPath,
        previewType: PreviewType.Thumbnail,
        sourceHash: 'abc123',
      });
      expect(result).toEqual(mockResult);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiscovery } from '../useDiscovery';
import { useSystemStore } from '@/stores/systemStore';
import { discoveryService } from '@/services/discoveryService';
import { RawFormat, DiscoveryStatus, FileProcessingStatus } from '@/types/discovery';
import type { DiscoverySession, DiscoveredFile, BatchIngestionResult } from '@/types/discovery';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock discovery service
vi.mock('@/services/discoveryService', () => ({
  discoveryService: {
    validateDiscoveryPath: vi.fn(),
    createDiscoveryConfig: vi.fn(),
    startDiscovery: vi.fn(),
    getDiscoveryStatus: vi.fn(),
    getDiscoveredFiles: vi.fn(),
    batchIngest: vi.fn(),
    stopDiscovery: vi.fn(),
    addProgressListener: vi.fn(),
  },
}));

describe('useDiscovery', () => {
  beforeEach(() => {
    // Reset store
    useSystemStore.setState({
      logs: [],
      importState: {
        isImporting: false,
        progress: 0,
        currentFile: '',
        sessionId: null,
        totalFiles: 0,
        processedFiles: 0,
        stage: 'idle',
        error: null,
      },
      appReady: false,
    });

    // Mock Date.now for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T12:00:00'));

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useDiscovery());

    expect(result.current.isScanning).toBe(false);
    expect(result.current.isIngesting).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.totalFiles).toBe(0);
    expect(result.current.processedFiles).toBe(0);
    expect(result.current.currentFile).toBe('');
    expect(result.current.stage).toBe('idle');
    expect(result.current.error).toBe(null);
    expect(result.current.sessionId).toBe(null);
  });

  it('should handle successful folder selection', async () => {
    const mockOpen = vi.mocked(await import('@tauri-apps/plugin-dialog')).open;
    const mockValidate = vi.mocked(discoveryService.validateDiscoveryPath);
    
    mockOpen.mockResolvedValue('/test/path');
    mockValidate.mockResolvedValue({ valid: true, type: 'directory', readable: true, writable: false, error: null });

    const { result } = renderHook(() => useDiscovery());

    let selectedPath: string | null = null;
    await act(async () => {
      selectedPath = await result.current.selectRootFolder();
    });

    expect(selectedPath).toBe('/test/path');
    expect(mockOpen).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: 'Select Root Folder for Import',
    });
    expect(mockValidate).toHaveBeenCalledWith('/test/path');
    
    const logs = useSystemStore.getState().logs;
    expect(logs.some(log => log.message.includes('Selected folder: /test/path'))).toBe(true);
  });

  it('should handle cancelled folder selection', async () => {
    const mockOpen = vi.mocked(await import('@tauri-apps/plugin-dialog')).open;
    
    mockOpen.mockResolvedValue(null);

    const { result } = renderHook(() => useDiscovery());

    let selectedPath: string | null = null;
    await act(async () => {
      selectedPath = await result.current.selectRootFolder();
    });

    expect(selectedPath).toBe(null);
    
    const logs = useSystemStore.getState().logs;
    expect(logs.some(log => log.message.includes('Folder selection cancelled'))).toBe(true);
  });

  it('should handle invalid path selection', async () => {
    const mockOpen = vi.mocked(await import('@tauri-apps/plugin-dialog')).open;
    const mockValidate = vi.mocked(discoveryService.validateDiscoveryPath);
    
    mockOpen.mockResolvedValue('/invalid/path');
    mockValidate.mockResolvedValue({ valid: false, type: 'nonexistent', readable: false, writable: false, error: 'Path does not exist' });

    const { result } = renderHook(() => useDiscovery());

    let selectedPath: string | null = null;
    await act(async () => {
      selectedPath = await result.current.selectRootFolder();
    });

    expect(selectedPath).toBe(null);
    expect(result.current.error).toBe('Path does not exist');
    expect(result.current.stage).toBe('error');
  });

  it('should start discovery scan successfully', async () => {
    const mockCreateConfig = vi.mocked(discoveryService.createDiscoveryConfig);
    const mockStartDiscovery = vi.mocked(discoveryService.startDiscovery);
    const mockAddProgressListener = vi.mocked(discoveryService.addProgressListener);
    
    mockCreateConfig.mockResolvedValue({
      rootPath: '/test/path',
      recursive: true,
      maxDepth: 10,
      maxFiles: 50000,
      formats: [RawFormat.CR3, RawFormat.RAF],
      excludeDirs: ['.git', 'node_modules'],
    });
    
    const mockSession: DiscoverySession = {
      sessionId: 'sess_123',
      config: {
        rootPath: '/test/path',
        recursive: true,
        maxDepth: 10,
        maxFiles: 50000,
        formats: [RawFormat.CR3, RawFormat.RAF],
        excludeDirs: ['.git', 'node_modules'],
      },
      status: DiscoveryStatus.SCANNING,
      filesFound: 100,
      filesProcessed: 0,
      filesWithErrors: 0,
      progressPercentage: 0,
      currentDirectory: '/test/path',
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
    };
    mockStartDiscovery.mockResolvedValue(mockSession);
    
    mockAddProgressListener.mockReturnValue(() => {});

    const { result } = renderHook(() => useDiscovery());

    await act(async () => {
      await result.current.startScan('/test/path');
    });

    // Check immediate state after starting scan
    expect(result.current.stage).toBe('scanning');
    expect(result.current.sessionId).toBe('sess_123');
    expect(result.current.totalFiles).toBe(100);
    expect(result.current.isImporting).toBe(true);
    expect(mockCreateConfig).toHaveBeenCalledWith('/test/path', true, 10, 50000);
    expect(mockStartDiscovery).toHaveBeenCalled();
    expect(mockAddProgressListener).toHaveBeenCalledWith('sess_123', expect.any(Function));
  });

  it('should handle discovery scan failure', async () => {
    const mockCreateConfig = vi.mocked(discoveryService.createDiscoveryConfig);
    
    mockCreateConfig.mockRejectedValue(new Error('Scan failed to start'));

    const { result } = renderHook(() => useDiscovery());

    await act(async () => {
      await result.current.startScan('/test/path');
    });

    expect(result.current.stage).toBe('error');
    expect(result.current.error).toBe('Scan failed to start');
    expect(result.current.isImporting).toBe(false);
  });

  it('should start ingestion successfully', async () => {
    const mockGetFiles = vi.mocked(discoveryService.getDiscoveredFiles);
    const mockBatchIngest = vi.mocked(discoveryService.batchIngest);
    
    // Set up session
    useSystemStore.setState({
      importState: {
        ...useSystemStore.getState().importState,
        sessionId: 'sess_123',
        stage: 'ingesting',
      },
    });

    const mockFiles: DiscoveredFile[] = [
      {
        id: '1',
        sessionId: 'sess_123',
        path: '/test/file1.cr3',
        filename: 'file1.cr3',
        sizeBytes: 1000000,
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
        id: '2',
        sessionId: 'sess_123',
        path: '/test/file2.cr3',
        filename: 'file2.cr3',
        sizeBytes: 2000000,
        format: RawFormat.CR3,
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: FileProcessingStatus.DISCOVERED,
        blake3Hash: null,
        errorMessage: null,
        ingestedAt: null,
        databaseId: null,
      },
    ];
    mockGetFiles.mockResolvedValue(mockFiles);
    
    const mockResult: BatchIngestionResult = {
      sessionId: 'sess_123',
      totalRequested: 2,
      successful: [
        {
          file: mockFiles[0]!,
          success: true,
          databaseId: 1,
          processingTimeMs: 500,
          error: null,
          metadata: null,
        },
        {
          file: mockFiles[1]!,
          success: true,
          databaseId: 2,
          processingTimeMs: 500,
          error: null,
          metadata: null,
        },
      ],
      failed: [],
      skipped: [],
      totalProcessingTimeMs: 1000,
      avgProcessingTimeMs: 500,
      successRate: 1.0,
    };
    mockBatchIngest.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useDiscovery());

    await act(async () => {
      await result.current.startIngestion('sess_123');
    });

    expect(result.current.stage).toBe('completed');
    expect(result.current.progress).toBe(100);
    expect(result.current.processedFiles).toBe(2);
    expect(result.current.isImporting).toBe(false);
    expect(mockGetFiles).toHaveBeenCalledWith('sess_123');
    expect(mockBatchIngest).toHaveBeenCalledWith({
      sessionId: 'sess_123',
      filePaths: ['/test/file1.cr3', '/test/file2.cr3'],
      skipExisting: true,
      maxFiles: null,
    });
  });

  it('should handle ingestion failure', async () => {
    const mockGetFiles = vi.mocked(discoveryService.getDiscoveredFiles);
    
    // Set up session
    useSystemStore.setState({
      importState: {
        ...useSystemStore.getState().importState,
        sessionId: 'sess_123',
        stage: 'ingesting',
      },
    });

    mockGetFiles.mockRejectedValue(new Error('Failed to get files'));

    const { result } = renderHook(() => useDiscovery());

    await act(async () => {
      await result.current.startIngestion('sess_123');
    });

    expect(result.current.stage).toBe('error');
    expect(result.current.error).toBe('Failed to get files');
    expect(result.current.isImporting).toBe(false);
  });

  it('should cancel operation successfully', async () => {
    const mockStopDiscovery = vi.mocked(discoveryService.stopDiscovery);
    const mockAddProgressListener = vi.mocked(discoveryService.addProgressListener);
    
    mockStopDiscovery.mockResolvedValue();
    mockAddProgressListener.mockReturnValue(() => {});
    
    const { result } = renderHook(() => useDiscovery());

    // Start a scan first to set up the session
    const mockCreateConfig = vi.mocked(discoveryService.createDiscoveryConfig);
    const mockStartDiscovery = vi.mocked(discoveryService.startDiscovery);
    
    mockCreateConfig.mockResolvedValue({
      rootPath: '/test/path',
      recursive: true,
      maxDepth: 10,
      maxFiles: 50000,
      formats: [RawFormat.CR3],
      excludeDirs: ['.git', 'node_modules'],
    });
    
    const mockSession: DiscoverySession = {
      sessionId: 'sess_123',
      config: {
        rootPath: '/test/path',
        recursive: true,
        maxDepth: 10,
        maxFiles: 50000,
        formats: [RawFormat.CR3],
        excludeDirs: ['.git', 'node_modules'],
      },
      status: DiscoveryStatus.SCANNING,
      filesFound: 100,
      filesProcessed: 0,
      filesWithErrors: 0,
      progressPercentage: 0,
      currentDirectory: '/test/path',
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
    };
    mockStartDiscovery.mockResolvedValue(mockSession);

    await act(async () => {
      await result.current.startScan('/test/path');
    });

    // Now cancel the operation
    await act(async () => {
      await result.current.cancel();
    });

    expect(result.current.stage).toBe('idle');
    expect(result.current.isImporting).toBe(false);
    expect(mockStopDiscovery).toHaveBeenCalledWith('sess_123');
  });

  it('should handle progress updates', async () => {
    const mockCreateConfig = vi.mocked(discoveryService.createDiscoveryConfig);
    const mockStartDiscovery = vi.mocked(discoveryService.startDiscovery);
    const mockAddProgressListener = vi.mocked(discoveryService.addProgressListener);
    
    mockCreateConfig.mockResolvedValue({
      rootPath: '/test/path',
      recursive: true,
      maxDepth: 10,
      maxFiles: 50000,
      formats: [RawFormat.CR3],
      excludeDirs: ['.git', 'node_modules'],
    });
    
    const mockSession: DiscoverySession = {
      sessionId: 'sess_123',
      config: {
        rootPath: '/test/path',
        recursive: true,
        maxDepth: 10,
        maxFiles: 50000,
        formats: [RawFormat.CR3],
        excludeDirs: ['.git', 'node_modules'],
      },
      status: DiscoveryStatus.SCANNING,
      filesFound: 100,
      filesProcessed: 0,
      filesWithErrors: 0,
      progressPercentage: 0,
      currentDirectory: '/test/path',
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
    };
    mockStartDiscovery.mockResolvedValue(mockSession);
    
    let progressCallback: ((progress: any) => void) | null = null;
    mockAddProgressListener.mockImplementation((_sessionId, callback) => {
      progressCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() => useDiscovery());

    await act(async () => {
      await result.current.startScan('/test/path');
    });

    // Simulate progress update
    if (progressCallback) {
      await act(async () => {
        progressCallback!({
          sessionId: 'sess_123',
          percentage: 50,
          processed: 50,
          total: 100,
          currentDirectory: '/test/subfolder',
          etaSeconds: 10,
          processingRate: 5,
        });
      });
    }

    expect(result.current.progress).toBe(50);
    expect(result.current.processedFiles).toBe(50);
    expect(result.current.totalFiles).toBe(100);
    expect(result.current.currentFile).toBe('Scanning: /test/subfolder');
  });

  it('should cleanup on unmount', async () => {
    const mockAddProgressListener = vi.mocked(discoveryService.addProgressListener);
    const unsubscribe = vi.fn();
    mockAddProgressListener.mockReturnValue(unsubscribe);

    const { result, unmount } = renderHook(() => useDiscovery());

    // Start a scan to set up the progress listener
    const mockCreateConfig = vi.mocked(discoveryService.createDiscoveryConfig);
    const mockStartDiscovery = vi.mocked(discoveryService.startDiscovery);
    
    mockCreateConfig.mockResolvedValue({
      rootPath: '/test/path',
      recursive: true,
      maxDepth: 10,
      maxFiles: 50000,
      formats: [RawFormat.CR3],
      excludeDirs: ['.git', 'node_modules'],
    });
    
    const mockSession: DiscoverySession = {
      sessionId: 'sess_123',
      config: {
        rootPath: '/test/path',
        recursive: true,
        maxDepth: 10,
        maxFiles: 50000,
        formats: [RawFormat.CR3],
        excludeDirs: ['.git', 'node_modules'],
      },
      status: DiscoveryStatus.SCANNING,
      filesFound: 100,
      filesProcessed: 0,
      filesWithErrors: 0,
      progressPercentage: 0,
      currentDirectory: '/test/path',
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
    };
    mockStartDiscovery.mockResolvedValue(mockSession);

    await act(async () => {
      await result.current.startScan('/test/path');
    });

    // Verify progress listener was set up
    expect(mockAddProgressListener).toHaveBeenCalledWith('sess_123', expect.any(Function));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});

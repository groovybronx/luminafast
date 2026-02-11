import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useSystemStore } from '../systemStore';

describe('systemStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useSystemStore.setState({
      logs: [],
      importState: {
        isImporting: false,
        progress: 0,
        currentFile: '',
      },
      appReady: false,
    });
    
    // Mock Date.now for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-11T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const store = useSystemStore.getState();
    expect(store.logs).toEqual([]);
    expect(store.importState).toEqual({
      isImporting: false,
      progress: 0,
      currentFile: '',
    });
    expect(store.appReady).toBe(false);
  });

  it('should add logs with default info type', () => {
    act(() => {
      useSystemStore.getState().addLog('Test message');
    });
    
    const logs = useSystemStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]?.message).toBe('Test message');
    expect(logs[0]?.color).toBe('text-zinc-400');
    expect(logs[0]?.time).toBe('12:00:00');
  });

  it('should add logs with specific types and colors', () => {
    act(() => {
      useSystemStore.getState().addLog('SQLite operation', 'sqlite');
      useSystemStore.getState().addLog('DuckDB query', 'duckdb');
      useSystemStore.getState().addLog('File operation', 'io');
      useSystemStore.getState().addLog('Sync operation', 'sync');
      useSystemStore.getState().addLog('Custom message', 'custom');
    });
    
    const logs = useSystemStore.getState().logs;
    expect(logs).toHaveLength(5);
    // Logs are chronological (oldest first)
    expect(logs[0]?.color).toBe('text-blue-400'); // sqlite
    expect(logs[1]?.color).toBe('text-amber-400'); // duckdb
    expect(logs[2]?.color).toBe('text-emerald-400'); // io
    expect(logs[3]?.color).toBe('text-purple-400'); // sync
    expect(logs[4]?.color).toBe('text-zinc-400'); // custom
  });

  it('should limit logs to 15 most recent', () => {
    act(() => {
      // Add 20 logs
      for (let i = 1; i <= 20; i++) {
        useSystemStore.getState().addLog(`Message ${i}`);
      }
    });
    
    const logs = useSystemStore.getState().logs;
    expect(logs).toHaveLength(15);
    // Logs are kept chronologically, but sliced to keep last 15.
    // So logs[0] should be Message 6, and logs[14] should be Message 20.
    expect(logs[0]?.message).toBe('Message 6'); // Oldest kept
    expect(logs[14]?.message).toBe('Message 20'); // Most recent
    expect(logs.find(log => log.message === 'Message 5')).toBeUndefined();
  });

  it('should clear all logs', () => {
    act(() => {
      useSystemStore.getState().addLog('Message 1');
      useSystemStore.getState().addLog('Message 2');
      useSystemStore.getState().addLog('Message 3');
    });
    
    expect(useSystemStore.getState().logs).toHaveLength(3);
    
    act(() => {
      useSystemStore.getState().clearLogs();
    });
    
    expect(useSystemStore.getState().logs).toEqual([]);
  });

  it('should update import state partially', () => {
    // Update just the importing flag
    act(() => {
      useSystemStore.getState().setImportState({ isImporting: true });
    });
    
    expect(useSystemStore.getState().importState).toEqual({
      isImporting: true,
      progress: 0,
      currentFile: '',
    });
    
    // Update progress and current file
    act(() => {
      useSystemStore.getState().setImportState({ 
        progress: 45, 
        currentFile: 'IMG_1234.CR3' 
      });
    });
    
    expect(useSystemStore.getState().importState).toEqual({
      isImporting: true,
      progress: 45,
      currentFile: 'IMG_1234.CR3',
    });
    
    // Reset importing flag
    act(() => {
      useSystemStore.getState().setImportState({ isImporting: false });
    });
    
    expect(useSystemStore.getState().importState).toEqual({
      isImporting: false,
      progress: 45,
      currentFile: 'IMG_1234.CR3',
    });
  });

  it('should set app ready state', () => {
    expect(useSystemStore.getState().appReady).toBe(false);
    
    act(() => {
      useSystemStore.getState().setAppReady(true);
    });
    expect(useSystemStore.getState().appReady).toBe(true);
    
    act(() => {
      useSystemStore.getState().setAppReady(false);
    });
    expect(useSystemStore.getState().appReady).toBe(false);
  });

  it('should handle complex import scenario', () => {
    // Start import
    act(() => {
      useSystemStore.getState().setImportState({ 
        isImporting: true, 
        currentFile: 'IMG_0001.CR3' 
      });
      
      // Add progress logs
      useSystemStore.getState().addLog('Import started', 'io');
      useSystemStore.getState().addLog('Processing IMG_0001.CR3', 'duckdb');
      
      // Update progress
      useSystemStore.getState().setImportState({ progress: 25 });
      
      // Continue with more files
      useSystemStore.getState().setImportState({ 
        currentFile: 'IMG_0002.CR3' 
      });
      useSystemStore.getState().addLog('Processing IMG_0002.CR3', 'duckdb');
      
      useSystemStore.getState().setImportState({ progress: 50 });
      
      // Complete import
      useSystemStore.getState().setImportState({ 
        isImporting: false, 
        progress: 100, 
        currentFile: '' 
      });
      useSystemStore.getState().addLog('Import completed successfully', 'sync');
    });
    
    // Verify final state
    expect(useSystemStore.getState().importState).toEqual({
      isImporting: false,
      progress: 100,
      currentFile: '',
    });
    const logs = useSystemStore.getState().logs;
    expect(logs).toHaveLength(4);
    // Logs are chronological
    expect(logs[0]?.message).toBe('Import started');
    expect(logs[3]?.message).toBe('Import completed successfully');
    expect(logs[3]?.color).toBe('text-purple-400'); // sync
  });

  it('should handle app readiness with logs', () => {
    act(() => {
      // Add startup logs
      useSystemStore.getState().addLog('Application starting...', 'info');
      useSystemStore.getState().addLog('Loading configuration', 'io');
      useSystemStore.getState().addLog('Database initialized', 'sqlite');
      
      // Mark app as ready
      useSystemStore.getState().setAppReady(true);
      useSystemStore.getState().addLog('Application ready', 'sync');
    });
    
    expect(useSystemStore.getState().appReady).toBe(true);
    const logs = useSystemStore.getState().logs;
    expect(logs).toHaveLength(4);
    // Logs are chronological
    expect(logs[0]?.message).toBe('Application starting...');
    expect(logs[3]?.message).toBe('Application ready');
    expect(logs[3]?.color).toBe('text-purple-400');
  });

  it('should format timestamps correctly', () => {
    // Test different times
    act(() => {
      vi.setSystemTime(new Date('2026-02-11T09:15:30'));
      useSystemStore.getState().addLog('Morning message');
      
      vi.setSystemTime(new Date('2026-02-11T23:59:59'));
      useSystemStore.getState().addLog('Night message');
      
      vi.setSystemTime(new Date('2026-02-11T00:00:01'));
      useSystemStore.getState().addLog('Midnight message');
    });
    
    const logs = useSystemStore.getState().logs;
    // Logs are chronological (oldest first)
    expect(logs[0]?.time).toBe('09:15:30'); // Morning
    expect(logs[1]?.time).toBe('23:59:59'); // Night
    expect(logs[2]?.time).toBe('00:00:01'); // Midnight
  });
});

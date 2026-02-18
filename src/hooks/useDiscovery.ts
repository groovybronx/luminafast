/**
 * useDiscovery Hook - Encapsulates discovery/ingestion logic for UI components
 * 
 * This hook provides a clean interface for the ImportModal to interact with
 * the discovery service without coupling UI to service implementation details.
 */

import { useCallback, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSystemStore } from '@/stores/systemStore';
import { discoveryService } from '@/services/discoveryService';
import type { 
  DiscoveryProgress, 
  BatchIngestionRequest 
} from '@/types/discovery';

/**
 * Hook return type
 */
export interface UseDiscoveryReturn {
  // Current state
  isScanning: boolean;
  isIngesting: boolean;
  isImporting: boolean;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  stage: 'idle' | 'scanning' | 'ingesting' | 'completed' | 'error';
  error: string | null;
  
  // Actions
  selectRootFolder: () => Promise<string | null>;
  startScan: (path: string) => Promise<void>;
  startIngestion: (sessionId: string) => Promise<void>;
  cancel: () => Promise<void>;
  
  // Session info
  sessionId: string | null;
}

/**
 * Hook for managing discovery and ingestion workflow
 */
export function useDiscovery(): UseDiscoveryReturn {
  const { importState, setImportState, addLog } = useSystemStore();
  const progressListenerRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Cleanup progress listener
  const cleanupProgressListener = useCallback(() => {
    if (progressListenerRef.current) {
      progressListenerRef.current();
      progressListenerRef.current = null;
    }
  }, []);

  // Handle progress updates
  const handleProgress = useCallback((progress: DiscoveryProgress) => {
    setImportState({
      progress: progress.percentage,
      processedFiles: progress.processed,
      totalFiles: progress.total,
      currentFile: progress.currentDirectory ? `Scanning: ${progress.currentDirectory}` : '',
    });

    // Log significant milestones
    if (progress.percentage === 25) {
      addLog('Discovery 25% complete', 'io');
    } else if (progress.percentage === 50) {
      addLog('Discovery 50% complete', 'io');
    } else if (progress.percentage === 75) {
      addLog('Discovery 75% complete', 'io');
    }
  }, [setImportState, addLog]);

  // Select root folder using native dialog
  const selectRootFolder = useCallback(async (): Promise<string | null> => {
    try {
      addLog('Opening folder selection dialog...', 'info');
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Root Folder for Import',
      });

      if (!selected) {
        addLog('Folder selection cancelled', 'info');
        return null;
      }

      const path = Array.isArray(selected) ? selected[0] : selected;
      
      // Validate the path
      const validation = await discoveryService.validateDiscoveryPath(path);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Invalid path selected';
        addLog(`Path validation failed: ${errorMsg}`, 'error');
        setImportState({ error: errorMsg, stage: 'error' });
        return null;
      }

      addLog(`Selected folder: ${path}`, 'io');
      return path;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Folder selection failed: ${errorMsg}`, 'error');
      setImportState({ error: errorMsg, stage: 'error' });
      return null;
    }
  }, [addLog, setImportState]);

  // Start discovery scan
  const startScan = useCallback(async (path: string): Promise<void> => {
    try {
      // Reset state
      setImportState({
        isImporting: true,
        progress: 0,
        totalFiles: 0,
        processedFiles: 0,
        currentFile: '',
        stage: 'scanning',
        error: null,
        sessionId: null,
      });

      addLog(`Starting discovery scan: ${path}`, 'io');

      // Create discovery config
      const config = await discoveryService.createDiscoveryConfig(
        path,
        true, // recursive
        10,   // max depth
        50000 // max files
      );

      addLog(`Discovery config created`, 'sqlite');

      // Start discovery
      const session = await discoveryService.startDiscovery(config);
      sessionIdRef.current = session.sessionId;
      
      setImportState({
        sessionId: session.sessionId,
        totalFiles: session.filesFound,
      });

      // Setup progress listener
      cleanupProgressListener();
      progressListenerRef.current = discoveryService.addProgressListener(
        session.sessionId,
        handleProgress
      );

      addLog(`Discovery session started: ${session.sessionId}`, 'sync');

      // Monitor session status
      const monitorSession = async () => {
        try {
          const status = await discoveryService.getDiscoveryStatus(session.sessionId);
          
          if (status.status === 'completed') {
            setImportState({
              stage: 'ingesting',
              totalFiles: status.filesFound,
            });
            addLog(`Discovery completed: ${status.filesFound} files found`, 'sync');
            cleanupProgressListener();
          } else if (status.status === 'error') {
            const errorMsg = 'Discovery failed';
            setImportState({
              stage: 'error',
              error: errorMsg,
              isImporting: false,
            });
            addLog(errorMsg, 'error');
            cleanupProgressListener();
          } else if (status.status === 'stopped') {
            setImportState({
              stage: 'idle',
              isImporting: false,
            });
            addLog('Discovery stopped', 'info');
            cleanupProgressListener();
          } else {
            // Continue monitoring
            setTimeout(monitorSession, 1000);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Session monitoring failed';
          setImportState({
            stage: 'error',
            error: errorMsg,
            isImporting: false,
          });
          addLog(errorMsg, 'error');
          cleanupProgressListener();
        }
      };

      // Start monitoring
      setTimeout(monitorSession, 500);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Scan failed to start';
      setImportState({
        stage: 'error',
        error: errorMsg,
        isImporting: false,
      });
      addLog(`Discovery scan failed: ${errorMsg}`, 'error');
    }
  }, [setImportState, addLog, handleProgress, cleanupProgressListener]);

  // Start ingestion
  const startIngestion = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setImportState({
        stage: 'ingesting',
        progress: 0,
        processedFiles: 0,
      });

      addLog(`Starting ingestion for session: ${sessionId}`, 'io');

      // Get discovered files
      const files = await discoveryService.getDiscoveredFiles(sessionId);
      addLog(`Retrieved ${files.length} files for ingestion`, 'sqlite');

      // Create batch ingestion request
      const request: BatchIngestionRequest = {
        sessionId,
        filePaths: files.map(f => f.path),
        skipExisting: true,
        maxFiles: null,
      };

      // Start batch ingestion
      const result = await discoveryService.batchIngest(request);
      
      addLog(`Ingestion completed: ${result.successful.length} successful, ${result.failed.length} failed`, 'sync');

      // Update final state
      setImportState({
        stage: 'completed',
        progress: 100,
        processedFiles: result.successful.length + result.failed.length + result.skipped.length,
        isImporting: false,
      });

      addLog('Import process completed successfully', 'sync');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Ingestion failed';
      setImportState({
        stage: 'error',
        error: errorMsg,
        isImporting: false,
      });
      addLog(`Ingestion failed: ${errorMsg}`, 'error');
    }
  }, [setImportState, addLog]);

  // Cancel current operation
  const cancel = useCallback(async (): Promise<void> => {
    try {
      if (sessionIdRef.current) {
        await discoveryService.stopDiscovery(sessionIdRef.current);
        addLog('Discovery stopped by user', 'info');
      }
      
      setImportState({
        stage: 'idle',
        isImporting: false,
      });
      
      cleanupProgressListener();
      sessionIdRef.current = null;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Cancel failed';
      addLog(`Cancel operation failed: ${errorMsg}`, 'error');
    }
  }, [setImportState, addLog, cleanupProgressListener]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupProgressListener();
    };
  }, [cleanupProgressListener]);

  return {
    // Current state
    isScanning: importState.stage === 'scanning',
    isIngesting: importState.stage === 'ingesting',
    isImporting: importState.isImporting,
    progress: importState.progress,
    totalFiles: importState.totalFiles,
    processedFiles: importState.processedFiles,
    currentFile: importState.currentFile,
    stage: importState.stage,
    error: importState.error,
    
    // Actions
    selectRootFolder,
    startScan,
    startIngestion,
    cancel,
    
    // Session info
    sessionId: importState.sessionId,
  };
}

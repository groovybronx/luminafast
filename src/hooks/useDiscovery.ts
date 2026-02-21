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
import { useCatalog } from '@/hooks/useCatalog';
import { previewService } from '@/services/previewService';
import type { DiscoveryProgress, BatchIngestionRequest, IngestionResult } from '@/types/discovery';
import { PreviewType } from '@/types';

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
  const { syncAfterImport } = useCatalog();
  const progressListenerRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startIngestionRef = useRef<((sessionId: string) => Promise<void>) | null>(null);

  // Generate previews for a list of successfully ingested images
  const generatePreviewsForImages = useCallback(
    async (successfulIngestions: IngestionResult[]) => {
      const previewPromises = successfulIngestions.map(async (ingestion) => {
        try {
          const hash = ingestion.metadata?.blake3Hash ?? ingestion.file.blake3Hash;
          if (!hash) {
            throw new Error('No hash available for preview generation');
          }

          // Generate thumbnail preview
          await previewService.generatePreview(ingestion.file.path, PreviewType.Thumbnail, hash);

          // Generate standard preview
          await previewService.generatePreview(ingestion.file.path, PreviewType.Standard, hash);

          // Generate 1:1 preview
          await previewService.generatePreview(ingestion.file.path, PreviewType.OneToOne, hash);

          return { success: true, file: ingestion.file };
        } catch (error) {
          console.error(`Failed to generate preview for ${ingestion.file.filename}:`, error);
          return { success: false, file: ingestion.file, error };
        }
      });

      const results = await Promise.allSettled(previewPromises);
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success,
      ).length;
      const failureCount = results.length - successCount;

      addLog(
        `Preview generation completed: ${successCount} success, ${failureCount} failed`,
        'sync',
      );
    },
    [addLog],
  );

  // Cleanup progress listener
  const cleanupProgressListener = useCallback(() => {
    if (progressListenerRef.current) {
      progressListenerRef.current();
      progressListenerRef.current = null;
    }
  }, []);

  // Handle progress updates
  const handleProgress = useCallback(
    (progress: DiscoveryProgress) => {
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
    },
    [setImportState, addLog],
  );

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
  const startScan = useCallback(
    async (path: string): Promise<void> => {
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
          10, // max depth
          50000, // max files
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
          handleProgress,
        );

        addLog(`Discovery session started: ${session.sessionId}`, 'sync');

        // Monitor session status with timeout protection
        let pollAttempts = 0;
        const maxPollAttempts = 600; // 10 minutes @ 1s interval

        const monitorSession = async () => {
          try {
            pollAttempts++;

            // Timeout protection
            if (pollAttempts > maxPollAttempts) {
              const errorMsg = `Discovery timeout after ${maxPollAttempts} attempts`;
              setImportState({
                stage: 'error',
                error: errorMsg,
                isImporting: false,
              });
              addLog(errorMsg, 'error');
              cleanupProgressListener();
              return;
            }

            const status = await discoveryService.getDiscoveryStatus(session.sessionId);

            if (status.status === 'completed') {
              setImportState({
                stage: 'ingesting',
                totalFiles: status.filesFound,
              });
              addLog(`Discovery completed: ${status.filesFound} files found`, 'sync');
              cleanupProgressListener();

              // Auto-start ingestion with the session
              setTimeout(() => {
                if (startIngestionRef.current) {
                  startIngestionRef.current(session.sessionId);
                }
              }, 100);
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
    },
    [setImportState, addLog, handleProgress, cleanupProgressListener],
  );

  // Start ingestion
  const startIngestion = useCallback(
    async (sessionId: string): Promise<void> => {
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

        if (files.length === 0) {
          addLog('No files found to ingest', 'warning');
          setImportState({
            stage: 'completed',
            progress: 100,
            processedFiles: 0,
            isImporting: false,
          });
          return;
        }

        // Create batch ingestion request
        const request: BatchIngestionRequest = {
          sessionId,
          filePaths: files.map((f) => f.path),
          skipExisting: true,
          maxFiles: null,
        };

        // Start batch ingestion
        const result = await discoveryService.batchIngest(request);

        addLog(
          `Ingestion completed: ${result.successful.length} successful, ${result.failed.length} failed, ${result.skipped.length} skipped`,
          'sync',
        );

        // Log failed files if any
        if (result.failed.length > 0) {
          addLog(`Failed files: ${result.failed.map((f) => f.file.filename).join(', ')}`, 'error');
        }

        // Generate previews FIRST before syncing catalog (Phase 2.3 critical order fix)
        // Must generate previews BEFORE useCatalog tries to load them in syncAfterImport()
        addLog('Generating previews for imported images...', 'sync');

        try {
          const previewServiceAvailable = await previewService.isAvailable();
          if (!previewServiceAvailable) {
            addLog('PreviewService not available, cannot generate previews', 'warning');
          } else {
            await generatePreviewsForImages(result.successful);
            addLog(`Previews generated for ${result.successful.length} images`, 'sync');
          }
        } catch (error) {
          addLog(`Preview generation failed: ${error}`, 'error');
        }

        // NOW sync catalog with new images - previews exist so useCatalog can load URLs correctly
        addLog('Syncing catalog with newly imported images...', 'sync');
        await syncAfterImport();
        // Mise à jour explicite de l'état à 'completed' après ingestion et génération de previews
        setImportState({
          stage: 'completed',
          progress: 100,
          processedFiles: result.successful.length,
          isImporting: false,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Ingestion failed';
        setImportState({
          stage: 'error',
          error: errorMsg,
          isImporting: false,
        });
        addLog(`Ingestion failed: ${errorMsg}`, 'error');

        // Offer retry option
        setTimeout(() => {
          addLog('You can retry the import by starting again', 'info');
        }, 3000);
      }
    },
    [setImportState, addLog, syncAfterImport, generatePreviewsForImages],
  );

  // Update ref when startIngestion changes
  useEffect(() => {
    startIngestionRef.current = startIngestion;
  }, [startIngestion]);

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

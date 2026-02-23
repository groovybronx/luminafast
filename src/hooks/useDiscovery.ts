/**
 * useDiscovery Hook - Encapsulates discovery/ingestion logic for UI components
 *
 * This hook provides a clean interface for the ImportModal to interact with
 * the discovery service without coupling UI to service implementation details.
 */

import { useCatalog } from '@/hooks/useCatalog';
import { discoveryService } from '@/services/discoveryService';
import { previewService } from '@/services/previewService';
import { useSystemStore } from '@/stores/systemStore';
import type {
  BatchIngestionRequest,
  DiscoveryProgress,
  IngestionProgress,
  IngestionResult,
} from '@/types/discovery';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useEffect, useMemo, useRef } from 'react';

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
  const ingestionListenerRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startIngestionRef = useRef<((sessionId: string) => Promise<void>) | null>(null);

  // Phase weights for progress calculation (must sum to 1.0)
  const PHASE_WEIGHTS = useMemo(
    () => ({
      scan: 0.3, // Discovery scan: 0-30%
      ingest: 0.4, // Ingestion (hashing + EXIF + DB): 30-70%
      previews: 0.3, // Preview generation: 70-100%
    }),
    [],
  );

  // Generate previews for a list of successfully ingested images
  const generatePreviewsForImages = useCallback(
    async (successfulIngestions: IngestionResult[]) => {
      // Parallelize preview generation (max 4 images at once to avoid memory issues)
      const BATCH_SIZE = 4;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < successfulIngestions.length; i += BATCH_SIZE) {
        const batch = successfulIngestions.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (ingestion) => {
          try {
            const hash = ingestion.metadata?.blake3Hash ?? ingestion.file.blake3Hash;
            if (!hash) {
              throw new Error('No hash available for preview generation');
            }

            // Generate complete pyramid (Thumbnail + Standard + 1:1) in a single pass
            // This is 3× faster than generating each type separately
            await previewService.generatePreviewPyramid(ingestion.file.path, hash);

            return { success: true, file: ingestion.file };
          } catch (error) {
            console.error(
              `Failed to generate preview pyramid for ${ingestion.file.filename}:`,
              error,
            );
            return { success: false, file: ingestion.file, error };
          }
        });

        const results = await Promise.allSettled(batchPromises);
        successCount += results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        failureCount += results.filter(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success),
        ).length;
      }

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

  // Cleanup ingestion listener
  const cleanupIngestionListener = useCallback(() => {
    if (ingestionListenerRef.current) {
      ingestionListenerRef.current();
      ingestionListenerRef.current = null;
    }
  }, []);

  // Handle discovery progress updates (Phase 1: Scan 0-30%)
  const handleProgress = useCallback(
    (progress: DiscoveryProgress) => {
      const scanProgress = progress.percentage / 100; // 0.0 - 1.0
      const globalProgress = scanProgress * PHASE_WEIGHTS.scan; // 0-30%

      setImportState({
        progress: globalProgress * 100, // Convert to 0-100
        processedFiles: progress.processed,
        totalFiles: progress.total,
        currentFile: progress.currentDirectory ? `Analyse: ${progress.currentDirectory}` : '',
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
    [setImportState, addLog, PHASE_WEIGHTS],
  );

  // Handle ingestion progress updates (Phase 2: Ingestion 30-70%)
  const handleIngestionProgress = useCallback(
    (progress: IngestionProgress) => {
      const ingestionProgress = progress.percentage; // 0.0 - 1.0
      const baseProgress = PHASE_WEIGHTS.scan; // Start at 30%
      const globalProgress = baseProgress + ingestionProgress * PHASE_WEIGHTS.ingest; // 30% + (0-40%)

      const displayName = progress.currentFile || 'Traitement...';

      setImportState({
        progress: globalProgress * 100, // Convert to 0-100
        processedFiles: progress.processed,
        totalFiles: progress.total,
        currentFile: `Ingestion: ${displayName}`,
      });

      // Log milestones
      if (progress.percentage === 0.25) {
        addLog(`Ingestion 25% complete (${progress.successful} files)`, 'io');
      } else if (progress.percentage === 0.5) {
        addLog(`Ingestion 50% complete (${progress.successful} files)`, 'io');
      } else if (progress.percentage === 0.75) {
        addLog(`Ingestion 75% complete (${progress.successful} files)`, 'io');
      }
    },
    [setImportState, addLog, PHASE_WEIGHTS],
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
          progress: PHASE_WEIGHTS.scan * 100, // Start at 30%
          processedFiles: 0,
        });

        addLog(`Starting ingestion for session: ${sessionId}`, 'io');

        // Setup ingestion progress listener
        cleanupIngestionListener();
        const unlisten = await listen<IngestionProgress>('ingestion-progress', (event) => {
          handleIngestionProgress(event.payload);
        });
        ingestionListenerRef.current = unlisten;

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

        // Start batch ingestion (now with parallel processing)
        const result = await discoveryService.batchIngest(request);

        addLog(
          `Ingestion completed: ${result.successful.length} successful, ${result.failed.length} failed, ${result.skipped.length} skipped`,
          'sync',
        );

        // Cleanup ingestion listener
        cleanupIngestionListener();

        // Log failed files if any
        if (result.failed.length > 0) {
          addLog(`Failed files: ${result.failed.map((f) => f.file.filename).join(', ')}`, 'error');
        }

        // Update progress to previews phase (70%)
        const previewsBaseProgress = PHASE_WEIGHTS.scan + PHASE_WEIGHTS.ingest; // 70%
        setImportState({
          progress: previewsBaseProgress * 100,
          currentFile: 'Génération previews...',
        });

        // Generate previews FIRST before syncing catalog (Phase 2.3 critical order fix)
        // Must generate previews BEFORE useCatalog tries to load them in syncAfterImport()
        addLog('Generating previews for imported images...', 'sync');

        try {
          const previewServiceAvailable = await previewService.isAvailable();
          if (!previewServiceAvailable) {
            addLog('PreviewService not available, cannot generate previews', 'warning');
          } else {
            const totalImages = result.successful.length;

            // Update progress during preview generation
            for (let i = 0; i < totalImages; i += 4) {
              const previewProgress = i / totalImages; // 0.0 - 1.0
              const globalProgress =
                previewsBaseProgress + previewProgress * PHASE_WEIGHTS.previews;

              const currentImage = result.successful[i];
              if (currentImage) {
                setImportState({
                  progress: globalProgress * 100,
                  processedFiles: i,
                  totalFiles: totalImages,
                  currentFile: `Previews: ${currentImage.file.filename}`,
                });
              }

              await new Promise((resolve) => setTimeout(resolve, 10));
            }

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
        cleanupIngestionListener();
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
    [
      setImportState,
      addLog,
      syncAfterImport,
      generatePreviewsForImages,
      PHASE_WEIGHTS,
      handleIngestionProgress,
      cleanupIngestionListener,
    ],
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
      cleanupIngestionListener();
    };
  }, [cleanupProgressListener, cleanupIngestionListener]);

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

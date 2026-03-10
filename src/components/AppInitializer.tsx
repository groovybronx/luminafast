import { useEffect, useRef } from 'react';
import { previewService } from '@/services/previewService';

interface AppInitializerProps {
  refreshCatalog: () => Promise<void>;
  addLog: (message: string, type?: string) => void;
  onInitComplete?: () => void;
}

export function AppInitializer({
  refreshCatalog,
  addLog,
  onInitComplete,
}: AppInitializerProps): null {
  const initializationTriggered = useRef(false);

  useEffect(() => {
    if (initializationTriggered.current) {
      return;
    }
    initializationTriggered.current = true;

    previewService
      .initialize()
      .then(() => {
        addLog('PreviewService initialized', 'system');
        return refreshCatalog();
      })
      .then(() => {
        onInitComplete?.();
      })
      .catch((error: unknown) => {
        addLog(`Initialization error: ${String(error)}`, 'error');
      });
  }, [addLog, onInitComplete, refreshCatalog]);

  return null;
}

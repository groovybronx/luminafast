import { useEffect, useCallback, useMemo, useRef } from 'react';
import type { FlagType, EditState, CatalogEvent, EventPayload, EventType } from './types';
import { safeID } from './lib/helpers';

import { useUiStore, useEditStore, useSystemStore } from './stores';
import { useCatalogStore } from './stores/catalogStore';
import { useCollectionStore } from './stores/collectionStore';
import { useFolderStore } from './stores/folderStore';
import { useCatalog } from './hooks/useCatalog';
import { previewService } from './services/previewService';
import { GlobalStyles } from './components/shared/GlobalStyles';
import { ArchitectureMonitor } from './components/shared/ArchitectureMonitor';
import { ImportModal } from './components/shared/ImportModal';
import { BatchBar } from './components/shared/BatchBar';
import { KeyboardOverlay } from './components/shared/KeyboardOverlay';
import { TopNav } from './components/layout/TopNav';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { Toolbar } from './components/layout/Toolbar';
import { Filmstrip } from './components/layout/Filmstrip';
import { RightSidebar } from './components/layout/RightSidebar';
import { GridView } from './components/library/GridView';
import { DevelopView } from './components/develop/DevelopView';

export default function App() {
  // Catalog hook - loads images from SQLite
  const {
    images,
    isLoading: catalogLoading,
    error: catalogError,
    refreshCatalog,
    syncAfterImport,
    hasImages,
    onRatingChange,
    onFlagChange,
    onTagsChange,
  } = useCatalog();

  // Stores Zustand
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const selectionSet = useUiStore((state) => state.selection);
  const toggleSelection = useUiStore((state) => state.toggleSelection);
  const setSingleSelection = useUiStore((state) => state.setSingleSelection);
  const filterText = useUiStore((state) => state.filterText);
  const setFilterText = useUiStore((state) => state.setFilterText);

  // Collection active (filtre par collection)
  const activeCollectionImageIds = useCollectionStore((state) => state.activeCollectionImageIds);

  // Folder active (filtre par dossier)
  const activeFolderImageIds = useFolderStore((state) => state.activeFolderImageIds);

  // Compute derived values with useMemo
  const selection = useMemo(() => Array.from(selectionSet), [selectionSet]);

  const filteredImages = useMemo(() => {
    // 1. Filtrer par collection active (priorité maximale)
    let baseImages =
      activeCollectionImageIds !== null
        ? images.filter((img) => activeCollectionImageIds.includes(img.id))
        : images;

    // 2. Filtrer par dossier actif (si aucune collection n'est active)
    if (activeCollectionImageIds === null && activeFolderImageIds !== null) {
      baseImages = baseImages.filter((img) => activeFolderImageIds.includes(img.id));
    }

    // 3. Appliquer le filtre texte
    if (!filterText) return baseImages;

    const q = filterText.toLowerCase();
    return baseImages.filter((img) => {
      if (q.startsWith('star')) return img.state.rating >= parseInt(q.split(' ')[1] ?? '0');
      if (q.includes('gfx'))
        return [img.exif.cameraMake, img.exif.cameraModel].join(' ').toLowerCase().includes('gfx');
      if (q.includes('iso')) {
        const val = parseInt(q.replace(/[^0-9]/g, ''));
        return (img.exif.iso ?? 0) >= val;
      }
      return (
        img.filename.toLowerCase().includes(q) ||
        (img.exif.lens ?? '').toLowerCase().includes(q) ||
        img.state.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [images, filterText, activeCollectionImageIds, activeFolderImageIds]);

  const logs = useSystemStore((state) => state.logs);
  const addLog = useSystemStore((state) => state.addLog);
  const eventLog = useEditStore((state) => state.eventLog);
  const addEvent = useEditStore((state) => state.addEvent);
  const showImport = useUiStore((state) => state.showImport);
  const setShowImport = useUiStore((state) => state.setShowImport);
  const showBeforeAfter = useUiStore((state) => state.showBeforeAfter);
  const toggleBeforeAfter = useUiStore((state) => state.toggleBeforeAfter);
  const thumbnailSize = useUiStore((state) => state.thumbnailSize);
  const setThumbnailSize = useUiStore((state) => state.setThumbnailSize);
  const sidebarOpen = useUiStore((state) => state.leftSidebarOpen);

  // Track if initial load has been triggered
  const initialLoadTriggered = useRef(false);

  // Initialize services and load catalog on mount (once only)
  useEffect(() => {
    if (!initialLoadTriggered.current) {
      initialLoadTriggered.current = true;

      // Initialize PreviewService first (Phase 2.3 du plan)
      previewService
        .initialize()
        .then(() => {
          addLog('PreviewService initialized', 'system');
          return refreshCatalog();
        })
        .catch((err) => {
          addLog(`Initialization error: ${err}`, 'error');
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  // Handle catalog errors
  useEffect(() => {
    if (catalogError) {
      addLog(`Catalog error: ${catalogError}`, 'error');
    }
  }, [catalogError, addLog]);

  const dispatchEvent = useCallback(
    (
      eventType: string,
      payload: number | string | 'pick' | 'reject' | null | Partial<EditState>,
    ) => {
      // Build typed EventPayload based on event type
      let typedPayload: EventPayload;
      if (eventType === 'RATING') typedPayload = { type: 'RATING', value: payload as number };
      else if (eventType === 'FLAG') typedPayload = { type: 'FLAG', value: payload as FlagType };
      else if (eventType === 'EDIT')
        typedPayload = { type: 'EDIT', value: payload as Partial<EditState> };
      else if (eventType === 'ADD_TAG')
        typedPayload = { type: 'ADD_TAG', value: payload as string };
      else typedPayload = { type: 'REMOVE_TAG', value: payload as string };

      const event: CatalogEvent = {
        id: safeID(),
        timestamp: Date.now(),
        type: eventType as EventType,
        payload: typedPayload,
        targets: selection,
      };
      addEvent(event);

      // Use SQLite sync callbacks instead of direct setImages
      // This ensures proper bidirectional sync with database
      if (eventType === 'RATING') {
        // Call onRatingChange for each selected image
        selection.forEach((imageId) => {
          onRatingChange(imageId, payload as number).catch((err) => {
            addLog(`Failed to update rating for image ${imageId}: ${err}`, 'error');
          });
        });
      } else if (eventType === 'FLAG') {
        // Call onFlagChange for each selected image
        selection.forEach((imageId) => {
          onFlagChange(imageId, payload as FlagType).catch((err) => {
            addLog(`Failed to update flag for image ${imageId}: ${err}`, 'error');
          });
        });
      } else if (eventType === 'ADD_TAG' || eventType === 'REMOVE_TAG') {
        // Handle tags - build current tags for each image
        selection.forEach((imageId) => {
          const image = images.find((img) => img.id === imageId);
          if (image) {
            let newTags = [...image.state.tags];
            if (eventType === 'ADD_TAG') {
              newTags = [...new Set([...newTags, payload as string])];
            } else {
              newTags = newTags.filter((t) => t !== payload);
            }
            onTagsChange(imageId, newTags).catch((err) => {
              addLog(`Failed to update tags for image ${imageId}: ${err}`, 'error');
            });
          }
        });
      } else if (eventType === 'EDIT') {
        // Edit events stay local for now (EDIT_STATE not synced to SQLite)
        const { setImages: updateLocalImages } = useCatalogStore.getState();
        const updatedImages = images.map((img) => {
          if (selection.includes(img.id)) {
            const newState = { ...img.state, isSynced: false };
            newState.edits = { ...newState.edits, ...(payload as Partial<EditState>) };
            return { ...img, state: newState };
          }
          return img;
        });
        updateLocalImages(updatedImages);
        addLog(`Edit stored for ${selection.length} asset(s)`, 'sqlite');
      }

      if (eventType !== 'EDIT') {
        addLog(`SQLite sync queued for ${selection.length} asset(s) [${eventType}]`, 'sqlite');
      }
    },
    [selection, addEvent, images, addLog, onRatingChange, onFlagChange, onTagsChange],
  );

  const handleToggleSelection = (id: number, e: React.MouseEvent) => {
    const isMultiSelect = e.shiftKey || e.metaKey;
    toggleSelection(id, isMultiSelect);
  };

  const handleImport = useCallback(async () => {
    // Close modal first for better UX
    setShowImport(false);
    addLog(`Import workflow completed, syncing catalog...`, 'sync');

    // Refresh catalog from SQLite to show newly imported images
    try {
      await syncAfterImport();
      addLog('Catalog refreshed from SQLite', 'sqlite');
    } catch (err) {
      addLog(`Failed to refresh catalog: ${err}`, 'error');
    }
  }, [setShowImport, addLog, syncAfterImport]);

  useEffect(() => {
    if (filterText.length > 2) {
      const start = performance.now();
      const resultCount = filteredImages.length;
      const end = performance.now();
      setTimeout(
        () =>
          addLog(
            `SQLite Filter: ${resultCount} images matched in ${(end - start).toFixed(2)}ms`,
            'sqlite',
          ),
        0,
      );
    }
  }, [filteredImages, filterText, addLog, setActiveView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (['1', '2', '3', '4', '5', '0'].includes(e.key)) dispatchEvent('RATING', parseInt(e.key));
      if (e.key === 'p') dispatchEvent('FLAG', 'pick');
      if (e.key === 'x') dispatchEvent('FLAG', 'reject');
      if (e.key === 'u') dispatchEvent('FLAG', null);
      if (e.key === 'g') setActiveView('library');
      if (e.key === 'd') setActiveView('develop');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchEvent, setActiveView]);

  const activeImg = images.find((i) => i.id === selection[0]) ?? images[0];

  // Show loading state while catalog is loading
  if (catalogLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p>Loading catalog from database...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no images after loading
  if (!hasImages && !catalogLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-300 font-sans">
        <GlobalStyles />
        <TopNav activeView={activeView} onSetActiveView={setActiveView} />

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-zinc-400 mb-4">Catalog is empty</h2>
            <p className="text-zinc-500 mb-8">Import your first photos to get started</p>
            <button
              onClick={() => setShowImport(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Import Photos
            </button>
          </div>
        </div>

        {showImport && (
          <ImportModal onClose={() => setShowImport(false)} onImportComplete={handleImport} />
        )}
        <ArchitectureMonitor logs={logs} />
      </div>
    );
  }

  // Main app UI (show even if activeImg is undefined - will use first image as fallback)
  const displayImg = activeImg || images[0];

  // Safety check - should not happen after hasImages check, but TypeScript needs it
  if (!displayImg) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <p className="text-xl text-zinc-500">No images available</p>
          <button
            onClick={() => setShowImport(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Import Photos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden select-none">
      <GlobalStyles />
      <TopNav activeView={activeView} onSetActiveView={setActiveView} />

      <div className="flex flex-1 min-h-0">
        <LeftSidebar
          sidebarOpen={sidebarOpen}
          imageCount={images.length}
          onSetFilterText={setFilterText}
          onShowImport={() => setShowImport(true)}
        />

        <div className="flex-1 flex flex-col bg-zinc-950 min-h-0 relative">
          <Toolbar
            activeView={activeView}
            onSetActiveView={setActiveView}
            filterText={filterText}
            onSetFilterText={setFilterText}
            thumbnailSize={thumbnailSize}
            onSetThumbnailSize={setThumbnailSize}
            showBeforeAfter={showBeforeAfter}
            onToggleBeforeAfter={toggleBeforeAfter}
          />

          <div className="flex-1 overflow-hidden">
            {activeView === 'library' ? (
              <GridView
                images={filteredImages}
                selection={selection}
                thumbnailSize={thumbnailSize}
                onToggleSelection={handleToggleSelection}
                onSetActiveView={setActiveView}
              />
            ) : (
              <DevelopView activeImg={displayImg} showBeforeAfter={showBeforeAfter} />
            )}
            <BatchBar
              selectionCount={selection.length}
              onDispatchEvent={dispatchEvent}
              onAddLog={addLog}
              onClearSelection={() => setSingleSelection(selection[0] ?? 0)}
            />
          </div>

          <Filmstrip
            images={images}
            selection={selection}
            selectionCount={selection.length}
            imageCount={images.length}
            onToggleSelection={handleToggleSelection}
          />
        </div>

        <RightSidebar
          activeView={activeView}
          activeImg={displayImg}
          eventLog={eventLog}
          onDispatchEvent={dispatchEvent}
        />
      </div>

      <ArchitectureMonitor logs={logs} />
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImportComplete={handleImport} />
      )}
      <KeyboardOverlay />
    </div>
  );
}

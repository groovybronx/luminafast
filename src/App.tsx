import { useEffect, useCallback, useMemo } from 'react';
import type { FlagType, EditState, CatalogEvent } from './types';
import { safeID } from './lib/helpers';
import { generateImages, INITIAL_IMAGES, type MockEvent } from './lib/mockData';
import { useCatalogStore, useUiStore, useEditStore, useSystemStore } from './stores';
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
  // Stores Zustand
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const images = useCatalogStore((state) => state.images);
  const setImages = useCatalogStore((state) => state.setImages);
  const selectionSet = useCatalogStore((state) => state.selection);
  const toggleSelection = useCatalogStore((state) => state.toggleSelection);
  const setSingleSelection = useCatalogStore((state) => state.setSingleSelection);
  const filterText = useCatalogStore((state) => state.filterText);
  const setFilterText = useCatalogStore((state) => state.setFilterText);
  
  // Compute derived values with useMemo
  const selection = useMemo(() => Array.from(selectionSet), [selectionSet]);
  
  const filteredImages = useMemo(() => {
    if (!filterText) return images;
    
    const q = filterText.toLowerCase();
    return images.filter(img => {
      if (q.startsWith('star')) return img.state.rating >= parseInt(q.split(' ')[1] ?? '0');
      if (q.includes('gfx')) return img.exif.camera.toLowerCase().includes('gfx');
      if (q.includes('iso')) {
        const val = parseInt(q.replace(/[^0-9]/g, ''));
        return img.exif.iso >= val;
      }
      return (
        img.filename.toLowerCase().includes(q) || 
        img.exif.lens.toLowerCase().includes(q) ||
        img.state.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [images, filterText]);
  
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
  
  // Initialisation des images au montage
  useEffect(() => {
    setImages(INITIAL_IMAGES);
  }, [setImages]);


  const dispatchEvent = useCallback((eventType: string, payload: number | string | FlagType | Partial<EditState>) => {
    const event: MockEvent = { id: safeID(), timestamp: Date.now(), type: eventType, payload, targets: selection };
    addEvent(event as unknown as CatalogEvent);
    
    // Mettre à jour les images
    const updatedImages = images.map(img => {
      if (selection.includes(img.id)) {
        const newState = { ...img.state, isSynced: false };
        if (eventType === 'RATING') newState.rating = payload as number;
        if (eventType === 'FLAG') newState.flag = payload as FlagType;
        if (eventType === 'EDIT') newState.edits = { ...newState.edits, ...(payload as Partial<EditState>) };
        if (eventType === 'ADD_TAG') newState.tags = [...new Set([...newState.tags, payload as string])];
        return { ...img, state: newState };
      }
      return img;
    });
    setImages(updatedImages);
    
    if (eventType !== 'EDIT') {
      addLog(`SQLite Transaction: ACID Commit for ${selection.length} assets`, 'sqlite');
      setTimeout(() => addLog(`PouchDB: Syncing revision ${safeID()} to CouchDB`, 'sync'), 1200);
    } else {
      addLog(`Event Sourcing: Replaying delta on FlatBuffer`, 'io');
    }
  }, [selection, addEvent, images, setImages, addLog]);

  const handleToggleSelection = (id: number, e: React.MouseEvent) => {
    const isMultiSelect = e.shiftKey || e.metaKey;
    toggleSelection(id, isMultiSelect);
  };

  const handleImport = useCallback(() => {
    const newBatch = generateImages(15, images.length);
    setImages([...newBatch, ...images]);
    setShowImport(false);
    addLog(`DUCKDB: Indexed ${newBatch.length} new binary references`, 'duckdb');
    addLog(`IO: File descriptors closed.`, 'io');
  }, [images.length, images, setImages, setShowImport, addLog]);


  useEffect(() => {
    if (filterText.length > 2) {
      const start = performance.now();
      const resultCount = filteredImages.length;
      const end = performance.now();
      setTimeout(() => addLog(`DUCKDB Scan: ${resultCount} rows found in ${(end - start).toFixed(2)}ms`, 'duckdb'), 0);
    }
  }, [filteredImages, filterText, addLog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (['1','2','3','4','5','0'].includes(e.key)) dispatchEvent('RATING', parseInt(e.key));
      if (e.key === 'p') dispatchEvent('FLAG', 'pick');
      if (e.key === 'x') dispatchEvent('FLAG', 'reject');
      if (e.key === 'u') dispatchEvent('FLAG', null);
      if (e.key === 'g') setActiveView('library');
      if (e.key === 'd') setActiveView('develop');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, dispatchEvent]);

  const activeImg = images.find(i => i.id === selection[0]) ?? images[0];

  // Ne pas rendre l'app si aucune image n'est disponible
  if (!activeImg) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        Chargement des images...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden select-none">
      <GlobalStyles />
      <TopNav activeView={activeView} onSetActiveView={setActiveView} />

      <div className="flex flex-1 min-h-0">
        <LeftSidebar sidebarOpen={sidebarOpen} imageCount={images.length} onSetFilterText={setFilterText} onShowImport={() => setShowImport(true)} />

        <div className="flex-1 flex flex-col bg-zinc-950 min-h-0 relative">
          <Toolbar
            activeView={activeView} onSetActiveView={setActiveView}
            filterText={filterText} onSetFilterText={setFilterText}
            thumbnailSize={thumbnailSize} onSetThumbnailSize={setThumbnailSize}
            showBeforeAfter={showBeforeAfter} onToggleBeforeAfter={toggleBeforeAfter}
          />

          <div className="flex-1 overflow-hidden">
            {activeView === 'library' ? (
            <GridView images={filteredImages} selection={selection} thumbnailSize={thumbnailSize} onToggleSelection={handleToggleSelection} onSetActiveView={setActiveView} />
            ) : (
              <DevelopView activeImg={activeImg} showBeforeAfter={showBeforeAfter} />
            )}
            <BatchBar selectionCount={selection.length} onDispatchEvent={dispatchEvent} onAddLog={addLog} onClearSelection={() => setSingleSelection(selection[0]!)} />
          </div>

          <Filmstrip images={images} selection={selection} selectionCount={selection.length} imageCount={images.length} onToggleSelection={handleToggleSelection} />
        </div>

        <RightSidebar activeView={activeView} activeImg={activeImg} eventLog={eventLog as MockEvent[]} onDispatchEvent={dispatchEvent} />
      </div>

      <ArchitectureMonitor logs={logs} />
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      <KeyboardOverlay />
    </div>
  );
}

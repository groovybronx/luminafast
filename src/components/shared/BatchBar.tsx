import { useState, useRef, useEffect } from 'react';
import { Check, Star, Tag, RefreshCw, X, FolderPlus, ChevronUp } from 'lucide-react';
import type { EditState } from '../../types';
import { useCollectionStore } from '../../stores/collectionStore';
import { useCatalogStore } from '../../stores/catalogStore';

interface BatchBarProps {
  selectionCount: number;
  onDispatchEvent: (eventType: string, payload: number | string | 'pick' | 'reject' | null | Partial<EditState>) => void;
  onAddLog: (message: string, type?: string) => void;
  onClearSelection: () => void;
}

export const BatchBar = ({ selectionCount, onDispatchEvent, onAddLog, onClearSelection }: BatchBarProps) => {
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const collections = useCollectionStore((state) => state.collections);
  const addImagesToCollection = useCollectionStore((state) => state.addImagesToCollection);
  const getSelectionArray = useCatalogStore((state) => state.getSelectionArray);

  // Fermer le picker si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCollectionPicker(false);
      }
    };
    if (showCollectionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCollectionPicker]);

  const handleAddToCollection = async (collectionId: number, collectionName: string) => {
    const ids = getSelectionArray();
    try {
      await addImagesToCollection(collectionId, ids);
      onAddLog(`Added ${ids.length} image(s) to "${collectionName}"`, 'sqlite');
    } catch {
      onAddLog(`Failed to add images to "${collectionName}"`, 'error');
    }
    setShowCollectionPicker(false);
  };

  if (selectionCount <= 1) return null;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-60 flex flex-col items-center gap-1 animate-in slide-in-from-bottom-6 duration-300">
      {/* Collection picker popover */}
      {showCollectionPicker && (
        <div
          ref={pickerRef}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 min-w-[200px] max-h-52 overflow-y-auto"
        >
          {collections.length === 0 ? (
            <p className="px-4 py-3 text-[11px] text-zinc-500 italic">Aucune collection disponible</p>
          ) : (
            collections.map((col) => (
              <button
                key={col.id}
                onClick={() => handleAddToCollection(col.id, col.name)}
                className="w-full text-left px-4 py-2 text-[12px] text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between gap-3 transition-colors"
              >
                <span className="truncate">{col.name}</span>
                <span className="text-zinc-600 text-[10px] shrink-0">{col.image_count} img</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* BatchBar principale */}
      <div className="bg-zinc-900/95 border border-blue-500/50 rounded-full px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[12px] font-black text-blue-400 uppercase tracking-widest">{selectionCount} ASSETS</span>
          <span className="text-[9px] text-zinc-600 font-mono uppercase">Batch Processing</span>
        </div>
        <div className="w-px h-8 bg-zinc-800"></div>
        <div className="flex gap-6">
          <button onClick={() => onDispatchEvent('FLAG', 'pick')} className="text-zinc-400 hover:text-emerald-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Check size={18}/> Pick</button>
          <button onClick={() => onDispatchEvent('RATING', 5)} className="text-zinc-400 hover:text-amber-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Star size={18}/> Favoris</button>
          <button
            onClick={() => setShowCollectionPicker((v) => !v)}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase transition-colors ${showCollectionPicker ? 'text-blue-400' : 'text-zinc-400 hover:text-blue-400'}`}
            title="Ajouter à une collection"
          >
            {showCollectionPicker ? <ChevronUp size={18}/> : <FolderPlus size={18}/>}
            Collection
          </button>
          <button disabled title="Non implémenté" className="opacity-40 cursor-not-allowed flex flex-col items-center gap-1 text-[9px] font-bold uppercase text-zinc-600"><Tag size={18}/> Tags</button>
          <button disabled title="Non implémenté" className="opacity-40 cursor-not-allowed flex flex-col items-center gap-1 text-[9px] font-bold uppercase text-zinc-600"><RefreshCw size={18}/> Sync</button>
        </div>
        <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full cursor-pointer text-zinc-500 hover:text-white transition-colors" onClick={onClearSelection}>
          <X size={16} />
        </div>
      </div>
    </div>
  );
};

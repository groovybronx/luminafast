import { useState, useRef, useEffect } from 'react';
import { Check, Star, Tag, RefreshCw, X, FolderPlus, ChevronUp } from 'lucide-react';
import type { EditState } from '../../types';
import { useCollectionStore } from '../../stores/collectionStore';
import { useUiStore } from '../../stores/uiStore';
import { useTagStore } from '../../stores/tagStore';
import type { TagNode } from '../../types/tag';

interface BatchBarProps {
  selectionCount: number;
  onDispatchEvent: (
    eventType: string,
    payload: number | string | 'pick' | 'reject' | null | Partial<EditState>,
  ) => void;
  onAddLog: (message: string, type?: string) => void;
  onClearSelection: () => void;
}

export const BatchBar = ({
  selectionCount,
  onDispatchEvent,
  onAddLog,
  onClearSelection,
}: BatchBarProps) => {
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const tagPickerRef = useRef<HTMLDivElement>(null);

  const collections = useCollectionStore((state) => state.collections);
  const addImagesToCollection = useCollectionStore((state) => state.addImagesToCollection);
  const selection = useUiStore((state) => state.selection);
  const { flatTags, addTagsToImages, createTag, loadTags } = useTagStore();

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false);
      }
    };
    if (showTagPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTagPicker]);

  const handleAddToCollection = async (collectionId: number, collectionName: string) => {
    const ids = Array.from(selection);
    try {
      await addImagesToCollection(collectionId, ids);
      onAddLog(`Added ${ids.length} image(s) to "${collectionName}"`, 'sqlite');
    } catch {
      onAddLog(`Failed to add images to "${collectionName}"`, 'error');
    }
    setShowCollectionPicker(false);
  };

  const handleAssignTagBatch = async (tag: TagNode) => {
    const ids = Array.from(selection);
    try {
      await addTagsToImages(ids, [tag.id]);
      onAddLog(`Tag "${tag.name}" ajouté à ${ids.length} image(s)`, 'sqlite');
    } catch {
      onAddLog(`Erreur lors de l'ajout du tag "${tag.name}"`, 'error');
    }
    setShowTagPicker(false);
  };

  const handleCreateTagBatch = async () => {
    const name = tagInput.trim();
    if (!name) return;
    const existing = flatTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await handleAssignTagBatch(existing);
      return;
    }
    try {
      const newTag = await createTag(name);
      const ids = Array.from(selection);
      await addTagsToImages(ids, [newTag.id]);
      onAddLog(`Tag "${newTag.name}" créé et ajouté à ${ids.length} image(s)`, 'sqlite');
    } catch {
      onAddLog('Erreur lors de la création du tag', 'error');
    }
    setShowTagPicker(false);
  };

  const tagSuggestions = flatTags.filter(
    (t) =>
      tagInput.trim().length > 0 && t.name.toLowerCase().includes(tagInput.trim().toLowerCase()),
  );

  if (selectionCount <= 1) return null;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-60 flex flex-col items-center gap-1 animate-in slide-in-from-bottom-6 duration-300">
      {/* Collection picker popover */}
      {showCollectionPicker && (
        <div
          ref={pickerRef}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 min-w-50 max-h-52 overflow-y-auto"
        >
          {collections.length === 0 ? (
            <p className="px-4 py-3 text-[11px] text-zinc-500 italic">
              Aucune collection disponible
            </p>
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

      {/* Tag picker popover */}
      {showTagPicker && (
        <div
          ref={tagPickerRef}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 min-w-52 max-h-64 overflow-y-auto"
        >
          <div className="px-3 pt-2 pb-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateTagBatch();
                if (e.key === 'Escape') setShowTagPicker(false);
              }}
              placeholder="Chercher ou créer un tag…"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          {tagSuggestions.length === 0 && !tagInput.trim() ? (
            <p className="px-4 py-2 text-[11px] text-zinc-500 italic">Tapez pour chercher…</p>
          ) : (
            <>
              {tagSuggestions.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => void handleAssignTagBatch(tag)}
                  className="w-full text-left px-4 py-2 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center justify-between gap-3 transition-colors"
                >
                  <span className="truncate">{tag.name}</span>
                  {tag.parentId != null && (
                    <span className="text-zinc-600 text-[10px] shrink-0">
                      ← {flatTags.find((t) => t.id === tag.parentId)?.name}
                    </span>
                  )}
                </button>
              ))}
              {tagInput.trim() &&
                !flatTags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                  <button
                    onClick={() => void handleCreateTagBatch()}
                    className="w-full text-left px-4 py-2 text-[11px] text-purple-400 hover:bg-zinc-800 hover:text-purple-300 transition-colors"
                  >
                    Créer « {tagInput.trim()} »
                  </button>
                )}
            </>
          )}
        </div>
      )}

      {/* BatchBar principale */}
      <div className="bg-zinc-900/95 border border-blue-500/50 rounded-full px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[12px] font-black text-blue-400 uppercase tracking-widest">
            {selectionCount} ASSETS
          </span>
          <span className="text-[9px] text-zinc-600 font-mono uppercase">Batch Processing</span>
        </div>
        <div className="w-px h-8 bg-zinc-800"></div>
        <div className="flex gap-6">
          <button
            onClick={() => onDispatchEvent('FLAG', 'pick')}
            className="text-zinc-400 hover:text-emerald-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"
          >
            <Check size={18} /> Pick
          </button>
          <button
            onClick={() => onDispatchEvent('RATING', 5)}
            className="text-zinc-400 hover:text-amber-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"
          >
            <Star size={18} /> Favoris
          </button>
          <button
            onClick={() => setShowCollectionPicker((v) => !v)}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase transition-colors ${showCollectionPicker ? 'text-blue-400' : 'text-zinc-400 hover:text-blue-400'}`}
            title="Ajouter à une collection"
          >
            {showCollectionPicker ? <ChevronUp size={18} /> : <FolderPlus size={18} />}
            Collection
          </button>
          <button
            onClick={() => {
              loadTags();
              setTagInput('');
              setShowTagPicker((v) => !v);
            }}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold uppercase transition-colors ${showTagPicker ? 'text-purple-400' : 'text-zinc-400 hover:text-purple-400'}`}
            title="Ajouter un tag à la sélection"
          >
            <Tag size={18} /> Tags
          </button>
          <button
            disabled
            title="Non implémenté"
            className="opacity-40 cursor-not-allowed flex flex-col items-center gap-1 text-[9px] font-bold uppercase text-zinc-600"
          >
            <RefreshCw size={18} /> Sync
          </button>
        </div>
        <div
          className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full cursor-pointer text-zinc-500 hover:text-white transition-colors"
          onClick={onClearSelection}
        >
          <X size={16} />
        </div>
      </div>
    </div>
  );
};

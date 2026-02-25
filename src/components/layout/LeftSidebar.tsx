import { Check, Database, Import, Pencil, Star, Trash2, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCollectionStore } from '../../stores/collectionStore';
import { useFolderStore } from '../../stores/folderStore';
import type { SmartQuery } from '../../types/collection';
import {
  isDragImageData,
  parseDragData,
  type CollectionDTO,
  type DragImageData,
} from '../../types';
import { FolderTree } from '../library/FolderTree';
import { SmartCollectionBuilder } from '../library/SmartCollectionBuilder';

interface LeftSidebarProps {
  sidebarOpen: boolean;
  imageCount: number;
  onSetFilterText: (text: string) => void;
  onShowImport: () => void;
}

// --- Sous-composant : Formulaire de création inline ---
interface NewCollectionInputProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function NewCollectionInput({ onConfirm, onCancel }: NewCollectionInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
    if (e.key === 'Escape') onCancel();
  };
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 text-[11px] bg-zinc-800 text-zinc-200 rounded px-2 py-1 outline-none border border-zinc-600 min-w-0"
        placeholder="Nom de la collection..."
        maxLength={80}
      />
      <button
        onClick={() => {
          if (value.trim()) onConfirm(value.trim());
        }}
        disabled={!value.trim()}
        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 transition-colors"
        aria-label="Valider"
      >
        <Check size={12} />
      </button>
      <button
        onClick={onCancel}
        className="text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Annuler"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// --- Sous-composant : Item de collection ---
interface CollectionItemProps {
  collection: CollectionDTO;
  isActive: boolean;
  isDragOver: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
  onDrop: (collectionId: number, dragData: DragImageData) => Promise<void>;
  onDragOver: () => void;
  onDragLeave: () => void;
}

function CollectionItem({
  collection,
  isActive,
  isDragOver,
  onSelect,
  onDelete,
  onRename,
  onDrop,
  onDragOver,
  onDragLeave,
}: CollectionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(collection.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // Track drag enter/leave to handle child elements

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== collection.name) onRename(collection.id, trimmed);
    setIsEditing(false);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    console.warn(
      `[CollectionItem] dragEnter on ${collection.name}, counter before: ${dragCounterRef.current}`,
    );
    dragCounterRef.current += 1;
    onDragOver();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    console.warn(`[CollectionItem] dragOver on ${collection.name}`);
  };

  const handleDragLeave = (_e: React.DragEvent) => {
    dragCounterRef.current -= 1;
    console.warn(
      `[CollectionItem] dragLeave on ${collection.name}, counter after: ${dragCounterRef.current}`,
    );
    // Only reset if we completely left the container (counter = 0)
    if (dragCounterRef.current === 0) {
      onDragLeave();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    console.warn(`[CollectionItem.handleDrop] Drop on ${collection.name}`);
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    onDragLeave();

    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      console.warn(`[CollectionItem.handleDrop] jsonStr:`, jsonStr);
      if (!jsonStr) {
        console.warn(`[CollectionItem.handleDrop] No JSON data found`);
        return;
      }

      const dragData = parseDragData(jsonStr);
      console.warn(`[CollectionItem.handleDrop] dragData:`, dragData);
      if (dragData && isDragImageData(dragData) && dragData.ids.length > 0) {
        console.warn(
          `[CollectionItem.handleDrop] Valid drag data, calling onDrop with ids:`,
          dragData.ids,
        );
        await onDrop(collection.id, dragData);
      } else {
        console.warn(
          `[CollectionItem.handleDrop] Invalid drag data or empty ids. dragData=${dragData ? 'exists' : 'null'}.`,
        );
      }
    } catch (err) {
      console.error(`[CollectionItem.handleDrop] Error:`, err);
      // Silently ignore invalid drag data (not logged by design)
    }
  };

  if (isEditing) {
    return (
      <div className="px-1 py-0.5">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          maxLength={80}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setEditValue(collection.name);
              setIsEditing(false);
            }
          }}
          onBlur={commitRename}
          title="Renommer la collection"
          className="w-full text-[11px] bg-zinc-800 text-zinc-200 rounded px-2 py-1 outline-none border border-blue-600"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 text-[11px] rounded group transition-colors select-none ${
        isDragOver ? 'bg-blue-500/30 border border-blue-400 border-dashed' : ''
      } ${
        isActive
          ? 'bg-blue-600/25 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        className="flex-1 flex items-center gap-2 p-1.5 min-w-0 text-left"
        onClick={() => onSelect(collection.id)}
      >
        <Database
          size={11}
          className={`${isActive ? 'text-blue-400' : 'text-zinc-600'} shrink-0`}
        />
        <span className="truncate">{collection.name}</span>
        <span className="ml-auto opacity-30 text-[9px] font-mono shrink-0">
          {collection.image_count}
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="p-1 opacity-0 group-hover:opacity-50 hover:opacity-100! text-zinc-500 hover:text-zinc-200 transition-all"
        aria-label={`Renommer ${collection.name}`}
      >
        <Pencil size={10} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(collection.id);
        }}
        className="p-1 opacity-0 group-hover:opacity-50 hover:opacity-100! text-zinc-500 hover:text-red-400 transition-all"
        aria-label={`Supprimer ${collection.name}`}
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

// --- Composant principal ---
export const LeftSidebar = ({
  sidebarOpen,
  imageCount,
  onSetFilterText,
  onShowImport,
}: LeftSidebarProps) => {
  const [showNewInput, setShowNewInput] = useState(false);
  const [showSmartBuilder, setShowSmartBuilder] = useState(false);
  const [dragOverCollectionId, setDragOverCollectionId] = useState<number | null>(null);

  const {
    collections,
    activeCollectionId,
    loadCollections,
    createCollection,
    createSmartCollection,
    deleteCollection,
    renameCollection,
    setActiveCollection,
    clearActiveCollection,
    addImagesToCollection,
  } = useCollectionStore();

  const { folderTree, loadFolderTree, setActiveFolder } = useFolderStore();

  useEffect(() => {
    void loadCollections();
    void loadFolderTree();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (name: string) => {
    setShowNewInput(false);
    try {
      await createCollection(name);
    } catch {
      /* erreur gérée dans le store */
    }
  };

  const handleSelect = async (id: number) => {
    onSetFilterText('');
    await setActiveCollection(id);
  };

  const handleClear = () => {
    onSetFilterText('');
    clearActiveCollection();
  };

  const staticCollections = collections.filter((c) => c.collection_type === 'static');
  const smartCollections = collections.filter((c) => c.collection_type === 'smart');

  const handleCreateSmartCollection = async (name: string, smartQuery: SmartQuery) => {
    setShowSmartBuilder(false);
    try {
      await createSmartCollection(name, smartQuery);
    } catch {
      /* erreur gérée dans le store */
    }
  };

  const handleDropOnCollection = async (collectionId: number, dragData: DragImageData) => {
    try {
      if (dragData.ids.length === 0) return;
      await addImagesToCollection(collectionId, dragData.ids);
      // TODO: Toast notification "✓ N image(s) ajoutée(s) à Collection" (Phase 3.2b impl)
    } catch (err) {
      // TODO: Error toast (Phase 3.2b impl)
      console.error('Error adding images to collection:', err);
    }
  };

  // Parent drag handlers (required to accept drags and propagate to children)
  const handleSidebarDragEnter = (e: React.DragEvent) => {
    console.warn('[LeftSidebar] Parent dragEnter - accepting drop zone');
    e.preventDefault();
  };

  const handleSidebarDragOver = (e: React.DragEvent) => {
    console.warn('[LeftSidebar] Parent dragOver');
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div
      className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-zinc-900 border-r border-black flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}
      onDragEnter={handleSidebarDragEnter}
      onDragOver={handleSidebarDragOver}
    >
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <section className="mb-8">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">
            Catalogue
          </div>
          <div className="space-y-0.5">
            <button
              onClick={handleClear}
              className={`w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 transition-colors ${activeCollectionId === null ? 'text-zinc-200' : 'text-zinc-400'}`}
            >
              <Database size={14} className="text-blue-500" /> Toutes les photos{' '}
              <span className="ml-auto opacity-30 text-[9px] font-mono">{imageCount}</span>
            </button>
            <button
              onClick={() => {
                handleClear();
                onSetFilterText('star 5');
              }}
              className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-400 group"
            >
              <Star
                size={14}
                className="text-amber-500 group-hover:scale-110 transition-transform"
              />{' '}
              Meilleures Notes
            </button>
            <button
              onClick={() => {
                handleClear();
                onSetFilterText('picked');
              }}
              className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-400"
            >
              <Check size={14} className="text-emerald-500" /> Sélection active
            </button>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 px-2">
            Collections
            <button
              onClick={() => setShowNewInput(true)}
              className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              aria-label="Créer une collection"
            >
              +
            </button>
          </div>
          <div className="space-y-0.5">
            {staticCollections.map((c) => (
              <CollectionItem
                key={c.id}
                collection={c}
                isActive={activeCollectionId === c.id}
                isDragOver={dragOverCollectionId === c.id}
                onSelect={(id) => void handleSelect(id)}
                onDelete={(id) => void deleteCollection(id)}
                onRename={(id, name) => void renameCollection(id, name)}
                onDrop={(collectionId, dragData) => handleDropOnCollection(collectionId, dragData)}
                onDragOver={() => setDragOverCollectionId(c.id)}
                onDragLeave={() => setDragOverCollectionId(null)}
              />
            ))}
            {showNewInput && (
              <NewCollectionInput
                onConfirm={(name) => void handleCreate(name)}
                onCancel={() => setShowNewInput(false)}
              />
            )}
            {staticCollections.length === 0 && !showNewInput && (
              <p className="text-[10px] text-zinc-700 italic px-2 py-1">
                Cliquez « + » pour créer une collection
              </p>
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 px-2">
            <span className="flex items-center gap-1">
              Smart Collections <Zap size={10} className="text-amber-600" />
            </span>
            <button
              onClick={() => setShowSmartBuilder(true)}
              className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              aria-label="Créer une smart collection"
            >
              +
            </button>
          </div>
          <div className="space-y-0.5">
            {smartCollections.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-1 text-[11px] rounded group transition-colors ${
                  activeCollectionId === c.id
                    ? 'bg-blue-600/25 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <button
                  className="flex-1 flex items-center gap-2 p-1.5 min-w-0 text-left"
                  onClick={() => void handleSelect(c.id)}
                >
                  <Zap
                    size={11}
                    className={`${
                      activeCollectionId === c.id ? 'text-amber-400' : 'text-zinc-600'
                    } shrink-0`}
                  />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto opacity-30 text-[9px] font-mono shrink-0">
                    {c.image_count}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteCollection(c.id);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-50 hover:opacity-100! text-zinc-500 hover:text-red-400 transition-all"
                  aria-label={`Supprimer ${c.name}`}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {smartCollections.length === 0 && !showSmartBuilder && (
              <p className="text-[10px] text-zinc-700 italic px-2 py-1">
                Cliquez « + » pour créer une smart collection
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">
            Dossiers
          </div>
          <div className="space-y-1">
            {folderTree.length > 0 ? (
              <FolderTree
                nodes={folderTree}
                onFolderSelected={async (id) => {
                  onSetFilterText('');
                  clearActiveCollection();
                  await setActiveFolder(id, true);
                }}
              />
            ) : (
              <p className="text-[10px] text-zinc-700 italic px-2 py-1">Aucun dossier importé</p>
            )}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-black bg-zinc-950">
        <button
          onClick={onShowImport}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all border border-blue-400/30"
        >
          <Import size={16} className="inline mr-2 mb-0.5" /> Importer RAW
        </button>
      </div>
      {/* Smart Collection Builder Modal */}
      {showSmartBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">Créer une Smart Collection</h2>
              <button
                onClick={() => setShowSmartBuilder(false)}
                className="text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <SmartCollectionBuilder
                onSave={async (query: SmartQuery, name: string) => {
                  await handleCreateSmartCollection(name, query);
                  setShowSmartBuilder(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

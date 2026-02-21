import { useState, useEffect, useRef } from 'react';
import { Database, Star, Check, Zap, HardDrive, Import, Trash2, Pencil, X } from 'lucide-react';
import { useCollectionStore } from '../../stores/collectionStore';
import type { CollectionDTO } from '../../types/dto';

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
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
}

function CollectionItem({
  collection,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: CollectionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(collection.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== collection.name) onRename(collection.id, trimmed);
    setIsEditing(false);
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
      className={`flex items-center gap-1 text-[11px] rounded group transition-colors ${
        isActive
          ? 'bg-blue-600/25 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
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
  const {
    collections,
    activeCollectionId,
    loadCollections,
    createCollection,
    deleteCollection,
    renameCollection,
    setActiveCollection,
    clearActiveCollection,
  } = useCollectionStore();

  useEffect(() => {
    void loadCollections();
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

  return (
    <div
      className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-zinc-900 border-r border-black flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}
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
                onSelect={(id) => void handleSelect(id)}
                onDelete={(id) => void deleteCollection(id)}
                onRename={(id, name) => void renameCollection(id, name)}
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
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2 flex justify-between items-center">
            Smart Collections <Zap size={10} className="text-amber-600" />
          </div>
          <div className="space-y-1 px-1">
            {['Moyen Format GFX', 'ISO Élevés (>1600)', 'Optiques 35mm', 'Importations 24h'].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-zinc-200 p-1.5 cursor-pointer rounded hover:bg-zinc-800/50"
                >
                  <Zap size={10} className="text-zinc-700" /> {item}
                </div>
              ),
            )}
          </div>
        </section>

        <section>
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">
            Folders
          </div>
          <div className="space-y-2 px-2">
            <div className="flex gap-2 items-center text-xs text-zinc-400 hover:text-white cursor-pointer">
              <HardDrive size={14} className="text-zinc-600" /> WORK_SSD_01
            </div>
            <div className="flex gap-2 items-center text-xs text-zinc-500 pl-4 border-l border-zinc-800 hover:text-white cursor-pointer">
              / 2025_PROJECT_X
            </div>
            <div className="flex gap-2 items-center text-xs text-zinc-500 pl-4 border-l border-zinc-800 hover:text-white cursor-pointer">
              / 2025_PERSONAL
            </div>
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
    </div>
  );
};

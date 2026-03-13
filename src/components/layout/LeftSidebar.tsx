import { Database, Import, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCollectionStore } from '@/stores/collectionStore';
import { useFolderStore } from '@/stores/folderStore';
import { useUiStore } from '@/stores/uiStore';
import type { DragImageData } from '@/types';
import type { SmartQuery } from '@/types/collection';
import { FolderTree } from '../library/FolderTree';
import { SmartCollectionBuilder } from '../library/SmartCollectionBuilder';
import { CollectionItem } from '../sidebar/CollectionItem';
import { NewCollectionInput } from '../sidebar/NewCollectionInput';
import { QuickFilters } from '../sidebar/QuickFilters';
import { SmartCollectionItem } from '../sidebar/SmartCollectionItem';

interface LeftSidebarProps {
  sidebarOpen: boolean;
  imageCount: number;
  onSetFilterText: (text: string) => void;
  onShowImport: () => void;
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

  const { folderTree, loadFolderTree, setActiveFolder, clearActiveFolder } = useFolderStore();

  const ratingFilter = useUiStore((state) => state.ratingFilter);
  const flagFilter = useUiStore((state) => state.flagFilter);
  const setRatingFilter = useUiStore((state) => state.setRatingFilter);
  const setFlagFilter = useUiStore((state) => state.setFlagFilter);

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
    clearActiveFolder();
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
    e.preventDefault();
  };

  const handleSidebarDragOver = (e: React.DragEvent) => {
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
          </div>
        </section>

        <QuickFilters
          ratingFilter={ratingFilter}
          flagFilter={flagFilter}
          onSetRatingFilter={setRatingFilter}
          onSetFlagFilter={setFlagFilter}
          onReset={() => {
            setRatingFilter(null);
            setFlagFilter(null);
          }}
        />

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
              <SmartCollectionItem
                key={c.id}
                collection={c}
                isActive={activeCollectionId === c.id}
                onSelect={(id) => void handleSelect(id)}
                onDelete={(id) => void deleteCollection(id)}
              />
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

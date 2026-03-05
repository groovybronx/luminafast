import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import { useTagStore } from '@/stores/tagStore';
import { TagService } from '@/services/tagService';
import type { TagDTO, TagNode } from '@/types/tag';
import { appendEvent } from '@/services/eventService';

interface TagsPanelProps {
  imageId: number;
  /** IDs supplémentaires pour les opérations batch (sélection multiple) */
  selectedImageIds?: number[];
}

/** Indentation CSS par niveau de profondeur dans la hiérarchie */
const INDENT_PER_LEVEL = 12;

/** Rendu récursif d'un nœud de l'arbre de gestion des tags */
function TagTreeNode({
  node,
  onRename,
  onDelete,
  depth = 0,
}: {
  node: TagNode;
  onRename: (id: number, current: string) => void;
  onDelete: (id: number) => void;
  depth?: number;
}) {
  return (
    <>
      <div
        className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-zinc-800/60 group"
        style={{ paddingLeft: `${depth * INDENT_PER_LEVEL + 4}px` }}
      >
        <span className="text-[10px] text-zinc-400 flex-1 truncate">{node.name}</span>
        <span className="text-[9px] text-zinc-600 ml-1 shrink-0">{node.imageCount}</span>
        <button
          onClick={() => onRename(node.id, node.name)}
          className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
          title="Renommer"
        >
          <Pencil size={9} />
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="ml-0.5 p-0.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
          title="Supprimer"
        >
          <Trash2 size={9} />
        </button>
      </div>
      {node.children.map((child) => (
        <TagTreeNode
          key={child.id}
          node={child}
          onRename={onRename}
          onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

/**
 * TagsPanel — Gestion des tags hiérarchiques pour une image (Phase 5.2)
 *
 * Affiche les tags de l'image active, permet d'en ajouter/retirer via auto-complétion,
 * et fournit un panneau de gestion (rename, delete) de l'arbre global.
 */
export const TagsPanel = ({ imageId, selectedImageIds = [] }: TagsPanelProps) => {
  const { tags, flatTags, loadTags, renameTag, deleteTag, addTagsToImages, removeTagsFromImages } =
    useTagStore();

  const [imageTags, setImageTags] = useState<TagDTO[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagNode[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Renommage inline
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Chargement initial des tags
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Chargement des tags de l'image active
  const loadImageTags = useCallback(async () => {
    try {
      const result = await TagService.getImageTags(imageId);
      setImageTags(result);
    } catch {
      setImageTags([]);
    }
  }, [imageId]);

  useEffect(() => {
    loadImageTags();
  }, [loadImageTags]);

  // Focus auto sur l'input de renommage
  useEffect(() => {
    if (renamingId != null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  // Filtrage des suggestions basé sur l'input (côté frontend, sans appel Tauri)
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    // Pour la syntaxe "Lieu/France", filtrer sur le dernier segment
    const lastSegment = trimmed.includes('/')
      ? (trimmed.split('/').pop()?.trim() ?? trimmed)
      : trimmed;
    const lower = lastSegment.toLowerCase();
    const filtered = flatTags.filter(
      (t) => t.name.toLowerCase().includes(lower) && !imageTags.some((it) => it.id === t.id),
    );
    setSuggestions(filtered.slice(0, 8));
    setActiveSuggestionIndex(-1);
    setShowSuggestions(filtered.length > 0 || trimmed.length > 0);
  }, [inputValue, flatTags, imageTags]);

  /** Ajoute un tag existant à l'image */
  const handleAssignTag = async (tag: TagNode) => {
    setIsLoading(true);
    try {
      const targetIds = selectedImageIds.length > 0 ? selectedImageIds : [imageId];
      await addTagsToImages(targetIds, [tag.id]);
      await appendEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        eventType: 'ADD_TAG',
        payload: { tagId: tag.id, tagName: tag.name },
        targetType: 'Image',
        targetId: imageId,
        createdAt: new Date().toISOString(),
      });
      await loadImageTags();
    } finally {
      setIsLoading(false);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  /** Crée un tag depuis l'input puis l'assigne. Supporte "Parent/Enfant/Petit-enfant" pour la hiérarchie. */
  const handleCreateAndAssign = async () => {
    const raw = inputValue.trim();
    if (!raw) return;

    const parts = raw
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      // Comportement simple : assigner si existant, sinon créer
      const exact = flatTags.find((t) => t.name.toLowerCase() === raw.toLowerCase());
      if (exact) {
        await handleAssignTag(exact);
        return;
      }
      setIsLoading(true);
      try {
        const newTag = await useTagStore.getState().createTag(raw);
        const targetIds = selectedImageIds.length > 0 ? selectedImageIds : [imageId];
        await addTagsToImages(targetIds, [newTag.id]);
        await appendEvent({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          eventType: 'ADD_TAG',
          payload: { tagId: newTag.id, tagName: newTag.name },
          targetType: 'Image',
          targetId: imageId,
          createdAt: new Date().toISOString(),
        });
        await loadImageTags();
      } finally {
        setIsLoading(false);
        setInputValue('');
        setShowSuggestions(false);
      }
    } else {
      // Création hiérarchique : "Lieu/France/Paris" → crée chaque niveau si absent
      setIsLoading(true);
      try {
        let parentId: number | undefined = undefined;
        let leafTag: TagNode | null = null;

        for (const part of parts) {
          // createTag() appelle loadTags() en interne → flatTags est à jour après chaque await
          const current = useTagStore
            .getState()
            .flatTags.find(
              (t) =>
                t.name.toLowerCase() === part.toLowerCase() &&
                (t.parentId ?? undefined) === parentId,
            );
          if (current) {
            parentId = current.id;
            leafTag = current;
          } else {
            const newTag = await useTagStore.getState().createTag(part, parentId);
            parentId = newTag.id;
            leafTag = newTag;
          }
        }

        if (leafTag) {
          const targetIds = selectedImageIds.length > 0 ? selectedImageIds : [imageId];
          await addTagsToImages(targetIds, [leafTag.id]);
          await appendEvent({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            eventType: 'ADD_TAG',
            payload: { tagId: leafTag.id, tagName: raw },
            targetType: 'Image',
            targetId: imageId,
            createdAt: new Date().toISOString(),
          });
          await loadImageTags();
        }
      } finally {
        setIsLoading(false);
        setInputValue('');
        setShowSuggestions(false);
      }
    }
  };

  /** Retire un tag de l'image */
  const handleRemoveTag = async (tagId: number, tagName: string) => {
    setIsLoading(true);
    try {
      const targetIds = selectedImageIds.length > 0 ? selectedImageIds : [imageId];
      await removeTagsFromImages(targetIds, [tagId]);
      await appendEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        eventType: 'REMOVE_TAG',
        payload: { tagId, tagName },
        targetType: 'Image',
        targetId: imageId,
        createdAt: new Date().toISOString(),
      });
      await loadImageTags();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleAssignTag(suggestions[activeSuggestionIndex]);
      } else {
        handleCreateAndAssign();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputValue('');
    }
  };

  const handleStartRename = (id: number, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };

  const handleConfirmRename = async () => {
    if (renamingId == null) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      await renameTag(renamingId, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDeleteTag = async (id: number) => {
    await deleteTag(id);
    await loadImageTags();
  };

  return (
    <div className="space-y-4">
      {/* En-tête de section */}
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        <Tag size={11} />
        Tags
      </div>

      {/* Tags actuels de l'image */}
      <div className="flex flex-wrap gap-1.5">
        {imageTags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded text-[10px] border border-zinc-700"
          >
            {t.name}
            <button
              onClick={() => handleRemoveTag(t.id, t.name)}
              disabled={isLoading}
              className="text-zinc-500 hover:text-red-400 transition-colors ml-0.5"
              title="Retirer ce tag"
            >
              <X size={9} />
            </button>
          </span>
        ))}
        {imageTags.length === 0 && (
          <span className="text-[10px] text-zinc-600 italic">Aucun tag</span>
        )}
      </div>

      {/* Input d'ajout / création avec auto-complétion */}
      <div className="relative">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Tag ou Lieu/France/Paris…"
            disabled={isLoading}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleCreateAndAssign}
            disabled={isLoading || !inputValue.trim()}
            className="p-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Ajouter"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Liste des suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl max-h-40 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  onMouseDown={() => handleAssignTag(s)}
                  className={`w-full text-left px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 transition-colors ${i === activeSuggestionIndex ? 'bg-zinc-700' : ''}`}
                >
                  {s.name}
                  {s.parentId != null && (
                    <span className="text-zinc-600 ml-1">
                      ← {flatTags.find((t) => t.id === s.parentId)?.name}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {inputValue.trim() &&
              !flatTags.some((t) => t.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                <li>
                  <button
                    onMouseDown={handleCreateAndAssign}
                    className="w-full text-left px-2 py-1 text-[10px] text-blue-400 hover:bg-zinc-700 transition-colors"
                  >
                    {inputValue.trim().includes('/')
                      ? `Créer hiérarchie « ${inputValue.trim().split('/').join(' › ')} »`
                      : `Créer « ${inputValue.trim()} »`}
                  </button>
                </li>
              )}
          </ul>
        )}
      </div>

      {/* Arbre de gestion des tags */}
      {tags.length > 0 && (
        <div className="pt-2 border-t border-zinc-800 space-y-0.5">
          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">
            Tous les tags
          </div>
          {tags.map((node) => (
            <TagTreeNode
              key={node.id}
              node={node}
              onRename={handleStartRename}
              onDelete={handleDeleteTag}
            />
          ))}
        </div>
      )}

      {/* Dialogue de renommage inline */}
      {renamingId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl w-64 space-y-3">
            <p className="text-[11px] font-bold text-zinc-300">Renommer le tag</p>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              title="Nouveau nom du tag"
              placeholder="Nouveau nom…"
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename();
                if (e.key === 'Escape') {
                  setRenamingId(null);
                  setRenameValue('');
                }
              }}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRenamingId(null);
                  setRenameValue('');
                }}
                className="px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={!renameValue.trim()}
                className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded flex items-center gap-1"
              >
                <Check size={10} /> OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

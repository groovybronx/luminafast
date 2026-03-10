import { Database, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { isDragImageData, parseDragData, type CollectionDTO, type DragImageData } from '@/types';

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

export function CollectionItem({
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

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== collection.name) {
      onRename(collection.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitRename();
      return;
    }

    if (event.key === 'Escape') {
      setEditValue(collection.name);
      setIsEditing(false);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragOver();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    const container = event.currentTarget as Node;

    if (!relatedTarget || !container.contains(relatedTarget)) {
      onDragLeave();
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDragLeave();

    try {
      const jsonStr = event.dataTransfer.getData('application/json');
      if (!jsonStr) {
        return;
      }

      const dragData = parseDragData(jsonStr);
      if (dragData && isDragImageData(dragData) && dragData.ids.length > 0) {
        await onDrop(collection.id, dragData);
      }
    } catch (error) {
      console.error('[CollectionItem] Drop error:', error);
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
          onChange={(event) => setEditValue(event.target.value)}
          onKeyDown={handleRenameKeyDown}
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
        onClick={(event) => {
          event.stopPropagation();
          setIsEditing(true);
        }}
        className="p-1 opacity-0 group-hover:opacity-50 hover:opacity-100! text-zinc-500 hover:text-zinc-200 transition-all"
        aria-label={`Renommer ${collection.name}`}
      >
        <Pencil size={10} />
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
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

import { Trash2, Zap } from 'lucide-react';
import type { CollectionDTO } from '@/types';

interface SmartCollectionItemProps {
  collection: CollectionDTO;
  isActive: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}

export function SmartCollectionItem({
  collection,
  isActive,
  onSelect,
  onDelete,
}: SmartCollectionItemProps) {
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
        <Zap size={11} className={`${isActive ? 'text-amber-400' : 'text-zinc-600'} shrink-0`} />
        <span className="truncate">{collection.name}</span>
        <span className="ml-auto opacity-30 text-[9px] font-mono shrink-0">
          {collection.image_count}
        </span>
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

import { Search, X, Maximize2, Grid, SplitSquareVertical, Image as ImageIcon } from 'lucide-react';
import type { ActiveView } from '../../types';

interface ToolbarProps {
  activeView: ActiveView;
  onSetActiveView: (view: ActiveView) => void;
  filterText: string;
  onSetFilterText: (text: string) => void;
  thumbnailSize: number;
  onSetThumbnailSize: (size: number) => void;
  showBeforeAfter: boolean;
  onToggleBeforeAfter: () => void;
}

export const Toolbar = ({
  activeView,
  onSetActiveView,
  filterText,
  onSetFilterText,
  thumbnailSize,
  onSetThumbnailSize,
  showBeforeAfter,
  onToggleBeforeAfter,
}: ToolbarProps) => (
  <div className="h-11 bg-zinc-900/60 border-b border-black flex items-center justify-between px-4 shrink-0 backdrop-blur-sm">
    <div className="flex gap-3 items-center">
      <div className="flex bg-black p-0.5 rounded-lg border border-zinc-800 shadow-inner">
        <button
          onClick={() => onSetActiveView('library')}
          className={`p-1.5 rounded-md transition-all ${activeView === 'library' ? 'bg-zinc-700 text-white shadow-lg' : ''}`}
          title="Grille (G)"
        >
          <Grid size={16} />
        </button>
        <button
          onClick={() => onSetActiveView('develop')}
          className={`p-1.5 rounded-md transition-all ${activeView === 'develop' ? 'bg-zinc-700 text-white shadow-lg' : ''}`}
          title="Développement (D)"
        >
          <Maximize2 size={16} />
        </button>
      </div>
      {activeView === 'develop' && (
        <div className="flex gap-1 border-l border-zinc-800 pl-3">
          <button
            onClick={onToggleBeforeAfter}
            className={`p-2 rounded border border-zinc-800 transition-colors ${showBeforeAfter ? 'bg-blue-600 text-white border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <SplitSquareVertical size={16} />
          </button>
        </div>
      )}
    </div>

    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-black/50 border border-zinc-800 rounded-full px-4 py-1.5 shadow-inner group focus-within:border-blue-500/50 transition-all">
        <Search size={14} className="text-zinc-600 group-focus-within:text-blue-500" />
        <input
          className="bg-transparent border-none outline-none text-xs w-64 text-zinc-300 font-mono placeholder:text-zinc-700"
          placeholder="Requête DuckDB (ex: star 5, iso 3200...)"
          value={filterText}
          onChange={(e) => onSetFilterText(e.target.value)}
        />
        {filterText && (
          <X
            size={12}
            className="cursor-pointer text-zinc-600 hover:text-white"
            onClick={() => onSetFilterText('')}
          />
        )}
      </div>
    </div>

    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 w-32">
        <ImageIcon size={10} className="text-zinc-600" />
        <input
          type="range"
          min="2"
          max="10"
          value={thumbnailSize}
          onChange={(e) => onSetThumbnailSize(parseInt(e.target.value))}
          className="flex-1 accent-zinc-500"
        />
        <ImageIcon size={16} className="text-zinc-600" />
      </div>
    </div>
  </div>
);

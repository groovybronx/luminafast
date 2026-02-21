import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogImage } from '../../types';

interface FilmstripProps {
  images: CatalogImage[];
  selection: number[];
  selectionCount: number;
  imageCount: number;
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
}

export const Filmstrip = ({
  images,
  selection,
  selectionCount,
  imageCount,
  onToggleSelection,
}: FilmstripProps) => (
  <div className="relative h-32 shrink-0">
    <div className="absolute inset-0 bg-zinc-900 border-t border-black flex flex-col">
      <div className="h-7 flex items-center justify-between px-4 bg-black/40 text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-black">
        <div className="flex gap-6 items-center">
          <span>Filmstrip</span>
          <span className="w-px h-3 bg-zinc-800"></span>
          <span className="text-blue-500">
            {selectionCount} / {imageCount} photos
          </span>
        </div>
        <div className="flex gap-4">
          <ChevronLeft size={16} className="cursor-pointer hover:text-white transition-colors" />
          <ChevronRight size={16} className="cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>
      <div className="flex-1 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar py-3 w-full">
        {images.map((img) => (
          <div
            key={img.id}
            onClick={(e) => onToggleSelection(img.id, e)}
            className={`h-20 aspect-[3/2] bg-zinc-800 shrink-0 border-2 transition-all relative rounded-md overflow-hidden ${selection.includes(img.id) ? 'border-blue-500 scale-110 z-10 shadow-2xl' : 'border-transparent opacity-40 hover:opacity-80'}`}
          >
            <img src={img.url} className="w-full h-full object-cover" alt="" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

import { Cloud, RefreshCw, Image as ImageIcon } from 'lucide-react';
import type { CatalogImage, ActiveView } from '../../types';
import './library.css';

interface GridViewProps {
  images: CatalogImage[];
  selection: number[];
  thumbnailSize: number;
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
  onSetActiveView: (view: ActiveView) => void;
}

export const GridView = ({ images, selection, thumbnailSize, onToggleSelection, onSetActiveView }: GridViewProps) => (
  <div className={`h-full overflow-y-auto p-4 grid gap-x-3 gap-y-4 auto-rows-min custom-scrollbar grid-view thumbnail-size-${thumbnailSize}`}> 
    {images.map(img => {
      const isSelected = selection.includes(img.id);
      const hasPreview = img.url && img.url.length > 0;
      
      return (
          <div key={img.id} 
            onClick={(e) => onToggleSelection(img.id, e)}
            onDoubleClick={() => onSetActiveView('develop')}
            className={`aspect-3/2 bg-zinc-900 border transition-all relative group rounded-lg overflow-hidden ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/20 z-10 scale-[0.97]' : 'border-zinc-800 hover:border-zinc-700 shadow-md'}`}>
            
            {hasPreview ? (
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <ImageIcon size={24} className="text-zinc-600" />
              </div>
            )}
            
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1 shadow-lg">
              {img.state.isSynced ? 
                (hasPreview ? <Cloud size={10} className="text-blue-400"/> : <RefreshCw size={10} className="text-amber-500 animate-spin"/>) 
                : <RefreshCw size={10} className="text-amber-500 animate-spin"/>
              }
            </div>
            
            <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-2 flex justify-between items-end translate-y-1 group-hover:translate-y-0 transition-transform">
              <div className="flex flex-col gap-0.5">
                <div className="text-[9px] font-mono text-zinc-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 uppercase tracking-tighter">{img.filename}</div>
                <div className="text-amber-400 text-[9px] flex drop-shadow-md">{'★'.repeat(img.state.rating)}</div>
              </div>
              <div className="text-[8px] font-mono text-zinc-500">{img.exif.iso} ISO</div>
            </div>

            {img.state.flag === 'pick' && <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-lg"></div>}
            {img.state.flag === 'reject' && <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-red-600 border-2 border-zinc-950 rounded-full shadow-lg"></div>}
          </div>
      );
    })}
  </div>
);

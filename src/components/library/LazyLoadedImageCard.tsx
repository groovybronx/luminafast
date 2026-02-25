import { Cloud, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CatalogImage, DragImageData } from '../../types';

interface LazyLoadedImageCardProps {
  image: CatalogImage;
  isSelected: boolean;
  itemWidth: number;
  itemHeight: number;
  selectedImageIds: number[]; // IDs of all selected images for multi-select drag
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
  onSetActiveView: (view: 'library' | 'develop') => void;
}

/**
 * Lazy-loaded image card with IntersectionObserver
 * Only loads preview when visible in viewport
 * Loads each image exactly once when intersection occurs
 * Checkpoint 3 implementation for Phase 3.1 maintenance
 */
export const LazyLoadedImageCard = ({
  image,
  isSelected,
  itemWidth,
  itemHeight,
  selectedImageIds,
  onToggleSelection,
  onSetActiveView,
}: LazyLoadedImageCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasInitializedRef = useRef(false); // Track if we've attempted load once

  // Setup IntersectionObserver for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Load image once when it becomes visible (and only once)
          if (entry.isIntersecting && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            requestAnimationFrame(() => {
              setIsVisible(true);
            });
          }
        });
      },
      { rootMargin: '100px' },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const hasPreview = isVisible && image.url && image.url.length > 0;

  // Handle drag start: serialize selected images (or just this one if not in multi-select)
  const handleDragStart = (e: React.DragEvent) => {
    if (!e.dataTransfer) return;

    const idsToSend = isSelected ? selectedImageIds : [image.id];
    const dragData: DragImageData = {
      type: 'image',
      ids: idsToSend,
    };

    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', `${idsToSend.length} image(s)`);

    // Optional: Custom drag image (uses default card visual)
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      draggable
      onClick={(e) => onToggleSelection(image.id, e)}
      onDoubleClick={() => onSetActiveView('develop')}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`shrink-0 bg-zinc-900 border transition-all relative group rounded-lg overflow-hidden cursor-pointer select-none ${
        isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'
      } ${
        isSelected
          ? 'border-blue-500 ring-4 ring-blue-500/20 z-10 scale-[0.97]'
          : 'border-zinc-800 hover:border-zinc-700 shadow-md'
      }`}
      style={{
        width: itemWidth,
        height: itemHeight,
      }}
    >
      {hasPreview ? (
        <img
          draggable={false}
          src={image.url}
          alt={image.filename}
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none select-none"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800 animate-pulse">
          <ImageIcon size={Math.max(16, itemHeight / 4)} className="text-zinc-600" />
        </div>
      )}

      {/* Sync status indicator */}
      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1 shadow-lg z-20">
        {image.state.isSynced ? (
          hasPreview ? (
            <Cloud size={10} className="text-blue-400" />
          ) : (
            <RefreshCw size={10} className="text-amber-500 animate-spin" />
          )
        ) : (
          <RefreshCw size={10} className="text-amber-500 animate-spin" />
        )}
      </div>

      {/* Metadata overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-2 flex justify-between items-end translate-y-1 group-hover:translate-y-0 transition-transform z-10">
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] font-mono text-zinc-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 uppercase tracking-tighter truncate">
            {image.filename}
          </div>
          <div className="text-amber-400 text-[9px] flex drop-shadow-md">
            {'★'.repeat(image.state.rating)}
          </div>
        </div>
        <div className="text-[8px] font-mono text-zinc-500 shrink-0">{image.exif.iso} ISO</div>
      </div>

      {/* Flag indicators */}
      {image.state.flag === 'pick' && (
        <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-lg z-20" />
      )}
      {image.state.flag === 'reject' && (
        <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-red-600 border-2 border-zinc-950 rounded-full shadow-lg z-20" />
      )}
    </div>
  );
};

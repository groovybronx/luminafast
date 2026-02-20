import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

/**
 * Virtualized grid component for rendering large image collections (5000+).
 * Uses @tanstack/react-virtual for efficient rendering with 60fps scrolling.
 * 
 * Thumbnail size calculation (pixels):
 * - Size 1-10 maps to 120px-600px per side
 * - Aspect ratio: 3/2 (width × 1.5 height)
 * - Gap: 12px (gap-x-3 gap-y-4 × 4px = 3/4 × 12px)
 */
export const GridView = ({ 
  images, 
  selection, 
  thumbnailSize, 
  onToggleSelection, 
  onSetActiveView 
}: GridViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Dynamic sizing based on thumbnailSize prop (1-10)
  const pixelSize = useMemo(() => {
    // Maps 1 -> 120px, 10 -> 600px (linear scaling)
    return Math.round(120 + (thumbnailSize - 1) * (480 / 9));
  }, [thumbnailSize]);
  
  const itemWidth = pixelSize;
  const itemHeight = Math.round(pixelSize / 1.5); // 3:2 aspect ratio
  const gap = 12; // gap-x-3 gap-y-4
  
  // Calculate columns based on container width
  const columnCount = useMemo(() => {
    if (!containerRef.current) return 1;
    const containerWidth = containerRef.current.clientWidth;
    const availableWidth = containerWidth - 32; // p-4 = 16px × 2
    const cellWidth = itemWidth + gap;
    return Math.max(1, Math.floor(availableWidth / cellWidth));
  }, [itemWidth, gap]);
  
  // Calculate virtual row/column layout
  const rowCount = Math.ceil(images.length / columnCount);
  
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => itemHeight + gap,
    overscan: 3, // Render 3 extra rows ahead for smooth scrolling
  });
  
  const virtualRows = rowVirtualizer.getVirtualItems();
  
  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto custom-scrollbar"
      style={{ contain: 'strict' }}
    >
      <div className="p-4">
        <div
          className="relative"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {virtualRows.map((virtualRow) => {
            const cells: CatalogImage[] = [];
            for (let i = 0; i < columnCount; i++) {
              const index = virtualRow.index * columnCount + i;
              const image = images[index];
              if (image) {
                cells.push(image);
              }
            }

            return (
              <div
                key={virtualRow.key}
                className="flex gap-3"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${itemHeight}px`,
                }}
              >
                {cells.map((img) => {
                  const isSelected = selection.includes(img.id);
                  const hasPreview = img.url && img.url.length > 0;
                  
                  return (
                    <div
                      key={img.id}
                      onClick={(e) => onToggleSelection(img.id, e)}
                      onDoubleClick={() => onSetActiveView('develop')}
                      className={`flex-shrink-0 bg-zinc-900 border transition-all relative group rounded-lg overflow-hidden cursor-pointer ${
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
                          src={img.url}
                          alt={img.filename}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <ImageIcon size={Math.max(16, itemHeight / 4)} className="text-zinc-600" />
                        </div>
                      )}

                      {/* Sync status indicator */}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1 shadow-lg">
                        {img.state.isSynced ? 
                          (hasPreview ? (
                            <Cloud size={10} className="text-blue-400" />
                          ) : (
                            <RefreshCw size={10} className="text-amber-500 animate-spin" />
                          )) 
                          : (
                            <RefreshCw size={10} className="text-amber-500 animate-spin" />
                          )
                        }
                      </div>

                      {/* Metadata overlay */}
                      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-2 flex justify-between items-end translate-y-1 group-hover:translate-y-0 transition-transform">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-[9px] font-mono text-zinc-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 uppercase tracking-tighter truncate">
                            {img.filename}
                          </div>
                          <div className="text-amber-400 text-[9px] flex drop-shadow-md">
                            {'★'.repeat(img.state.rating)}
                          </div>
                        </div>
                        <div className="text-[8px] font-mono text-zinc-500 flex-shrink-0">
                          {img.exif.iso} ISO
                        </div>
                      </div>

                      {/* Flag indicators */}
                      {img.state.flag === 'pick' && (
                        <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-lg"></div>
                      )}
                      {img.state.flag === 'reject' && (
                        <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-red-600 border-2 border-zinc-950 rounded-full shadow-lg"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

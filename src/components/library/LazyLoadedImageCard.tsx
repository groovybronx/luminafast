import { Cloud, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CatalogImage, DragImageData } from '../../types';
import PreviewRenderer from './PreviewRenderer';

interface LazyLoadedImageCardProps {
  image: CatalogImage;
  isSelected: boolean;
  itemWidth: number;
  itemHeight: number;
  selectedImageIds: number[]; // IDs of all selected images for multi-select drag
  /** Phase 6.3: defer thumbnail loading while user scrolls rapidly */
  isScrollingFast?: boolean;
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
  onSetActiveView: (view: 'library' | 'develop') => void;
}

/**
 * Lazy-loaded image card with IntersectionObserver.
 * Only loads preview when visible in viewport.
 *
 * Phase 6.3 — Advanced Grid Virtualization:
 * - Defers thumbnail loading while `isScrollingFast` is true
 * - Uses shimmer skeleton placeholder during load
 * - Triggers deferred load as soon as scrolling slows down
 */
export const LazyLoadedImageCard = ({
  image,
  isSelected,
  itemWidth,
  itemHeight,
  selectedImageIds,
  isScrollingFast = false,
  onToggleSelection,
  onSetActiveView,
}: LazyLoadedImageCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasInitializedRef = useRef(false); // true once load has been triggered
  const pendingLoadRef = useRef(false); // true when intersecting during fast scroll
  const isScrollingFastRef = useRef(isScrollingFast);

  // Keep ref in sync with prop to avoid stale closure in IntersectionObserver callback
  useEffect(() => {
    isScrollingFastRef.current = isScrollingFast;
  }, [isScrollingFast]);

  // Phase 6.3 — When scrolling stops, trigger deferred loads
  useEffect(() => {
    if (!isScrollingFast && pendingLoadRef.current && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      pendingLoadRef.current = false;
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [isScrollingFast]);

  // Setup IntersectionObserver for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasInitializedRef.current) {
            if (!isScrollingFastRef.current) {
              // Load immediately when not fast scrolling
              hasInitializedRef.current = true;
              requestAnimationFrame(() => {
                setIsVisible(true);
              });
            } else {
              // Defer: mark as pending, will load when scroll slows down
              pendingLoadRef.current = true;
            }
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

  const hasPreview = isVisible && image.urls.thumbnail && image.urls.thumbnail.length > 0;

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
        <>
          {/*      {(() => {
            // Log console pour traçabilité phase 4.2a
            if (import.meta.env.DEV) {
              console.warn(`PreviewRenderer applied for imageId=${image.id}`);
            }
            return null;
          })()} */}
          <PreviewRenderer
            imageId={image.id}
            previewUrl={image.urls.thumbnail}
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none select-none"
            isSelected={isSelected}
            useWasm={true}
          />
        </>
      ) : (
        <div className="w-full h-full grid-skeleton-shimmer" data-testid="shimmer-skeleton" />
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
          {image.state.rating > 0 && (
            <div className="text-amber-400 text-[9px] flex drop-shadow-md">
              {'★'.repeat(image.state.rating)}
              {'☆'.repeat(5 - image.state.rating)}
            </div>
          )}
        </div>
        <div className="text-[8px] font-mono text-zinc-500 shrink-0">{image.exif.iso} ISO</div>
      </div>

      {/* Phase 5.3 — Flag badge (pick = vert P, reject = rouge X) */}
      {image.state.flag === 'pick' && (
        <div
          className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-black leading-none px-1 py-0.5 rounded shadow-lg z-20 select-none"
          aria-label="Pick"
          title="Pick (P)"
        >
          P
        </div>
      )}
      {image.state.flag === 'reject' && (
        <div
          className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black leading-none px-1 py-0.5 rounded shadow-lg z-20 select-none"
          aria-label="Reject"
          title="Reject (X)"
        >
          X
        </div>
      )}
    </div>
  );
};

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveView, CatalogImage } from '../../types';
import { LazyLoadedImageCard } from './LazyLoadedImageCard';
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
  onSetActiveView,
}: GridViewProps) => {
  // Opt out of React Compiler memoization: useVirtualizer returns functions
  // that cannot be safely memoized (stale UI risk).
  'use no memo';

  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width to recalculate columns on resize
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set initial width
    setContainerWidth(el.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Dynamic sizing based on thumbnailSize prop (1-10)
  const pixelSize = useMemo(() => {
    // Maps 1 -> 120px, 10 -> 600px (linear scaling)
    return Math.round(120 + (thumbnailSize - 1) * (480 / 9));
  }, [thumbnailSize]);

  const itemWidth = pixelSize;
  const itemHeight = Math.round(pixelSize / 1.5); // 3:2 aspect ratio
  const gap = 12; // gap-x-3 gap-y-4

  // Calculate columns based on measured container width (reacts to resize)
  const columnCount = useMemo(() => {
    if (containerWidth === 0) return 1;
    const availableWidth = containerWidth - 32; // p-4 = 16px × 2
    const cellWidth = itemWidth + gap;
    return Math.max(1, Math.floor(availableWidth / cellWidth));
  }, [containerWidth, itemWidth, gap]);

  // Calculate virtual row/column layout
  const rowCount = Math.ceil(images.length / columnCount);

  // eslint-disable-next-line react-hooks/incompatible-library
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
      className="h-full overflow-y-auto custom-scrollbar grid-virtual-container"
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

                  return (
                    <LazyLoadedImageCard
                      key={img.id}
                      image={img}
                      isSelected={isSelected}
                      itemWidth={itemWidth}
                      itemHeight={itemHeight}
                      selectedImageIds={selection}
                      onToggleSelection={onToggleSelection}
                      onSetActiveView={onSetActiveView}
                    />
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

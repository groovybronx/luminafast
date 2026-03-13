/**
 * Composant PreviewRenderer — Phase 4.2 (CSS + WASM Rendering)
 * Affiche un aperçu d'image avec filtres appliqués en temps réel
 * Phase A: CSS filters (toujours disponible)
 * Phase B: WASM pixel processing (optionnel, activation via useWasm=true)
 *
 * NOTE: Maintenance refactoring — Utilise useWasmCanvasRender pour encapsuler
 * la logique d'image loading + WASM rendering (élimine duplication code)
 */

import { useEffect, useRef, useState } from 'react';
import { applyCSSFilters, eventsToPixelFilters } from '@/services/renderingService';
import { CatalogService } from '@/services/catalogService';
import { useEditStore } from '@/stores/editStore';
import { useWasmCanvasRender } from '@/hooks/useWasmCanvasRender';
import type { PixelFilterState } from '@/types/rendering';

interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean; // Phase B: toggle WASM vs CSS fallback
}

/**
 * Composant React pour afficher une image avec filtres appliqués
 * - Phase A: CSS filters sur <img> (toujours disponible, performant)
 * - Phase B: WASM pixel processing sur <canvas> (si useWasm=true et WASM disponible)
 *
 * @example
 * <PreviewRenderer
 *   imageId={123}
 *   previewUrl="/previews/abc123.jpg"
 *   useWasm={true}  // Activation Phase B
 *   className="thumbnail"
 * />
 */
export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  imageId,
  previewUrl,
  className = '',
  isSelected = false,
  useWasm = true,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pixelFilters, setPixelFilters] = useState<PixelFilterState>({
    exposure: 0,
    contrast: 0,
    saturation: 1,
    highlights: 0,
    shadows: 0,
    clarity: 0,
    vibrance: 0,
    colorTemp: 5500,
    tint: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get edit store actions + selector for subscription
  const setEditEventsForImage = useEditStore((state) => state.setEditEventsForImage);
  const clearEditEventsForImage = useEditStore((state) => state.clearEditEventsForImage);
  const editEventsForImage = useEditStore((state) => state.editEventsPerImage[imageId]);

  // Load filters from Event Sourcing on mount and when imageId changes
  useEffect(() => {
    let isMounted = true;

    const loadFilters = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupérer les événements depuis Event Sourcing
        const imageEvents = await CatalogService.getEditEvents(imageId);

        if (!isMounted) return;

        // Stocker dans EditStore pour subscription
        setEditEventsForImage(imageId, imageEvents);

        // Calculer filtres pixel complets (tous les 9 filtres pour WASM)
        const allPixelFilters = eventsToPixelFilters(imageEvents);
        setPixelFilters(allPixelFilters);

        /*  if (import.meta.env.DEV) {
          console.warn(
            `[PreviewRenderer] Loaded ${imageEvents.length} events for imageId=${imageId}`,
          );
        } */
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (isMounted) {
          setError(errorMsg);
          if (import.meta.env.DEV) {
            console.warn(`[PreviewRenderer] Failed to load filters for image ${imageId}:`, err);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFilters();

    return () => {
      isMounted = false;
      clearEditEventsForImage(imageId);
    };
  }, [imageId, setEditEventsForImage, clearEditEventsForImage]);

  // Apply CSS filters to <img> (Phase A fallback) — derive from pixelFilters
  useEffect(() => {
    if (!useWasm && imgRef.current) {
      applyCSSFilters(imgRef.current, {
        exposure: pixelFilters.exposure,
        contrast: pixelFilters.contrast,
        saturation: pixelFilters.saturation,
      });
    }
  }, [pixelFilters, useWasm]);

  // Render canvas using WASM via hook (Phase B)
  // Hook encapsulates: image loading, canvas sizing, WASM rendering, error handling
  // Standard max width for canvas (CSS will scale it to fit container)
  useWasmCanvasRender(
    canvasRef,
    previewUrl,
    pixelFilters,
    2048, // Standard max width for clean rendering
    1536, // Standard max height (aspect ratio 4:3)
  );

  // Monitor EditStore changes and update filters reactively (all 9 filters for WASM)
  useEffect(() => {
    const allPixelFilters = eventsToPixelFilters(editEventsForImage ?? []);
    setPixelFilters(allPixelFilters);
  }, [editEventsForImage]);

  return (
    <div
      ref={containerRef}
      className={`preview-renderer${isSelected ? ' selected' : ''}${error ? ' error' : ''}`}
      style={{
        position: 'relative',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Phase B: WASM Canvas (shown if useWasm enabled) */}
      {useWasm && (
        <canvas
          ref={canvasRef}
          className={className}
          data-testid={`preview-renderer-canvas-${imageId}`}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      )}

      {/* Phase A: CSS Filtered Image (fallback or CSS-only mode) */}
      {!useWasm && (
        <img
          ref={imgRef}
          src={previewUrl || undefined}
          alt={`Preview for image ${imageId}`}
          className={className}
          data-testid={`preview-renderer-img-${imageId}`}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => {
            setError('Failed to load image');
            if (import.meta.env.DEV) {
              console.error(`[PreviewRenderer] Image load error: ${previewUrl}`);
            }
          }}
        />
      )}

      {/* Error indicator (dev only) */}
      {error && import.meta.env.DEV && (
        <div
          title={error}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            background: 'rgba(255,0,0,0.3)',
            padding: '4px',
          }}
        >
          ⚠️
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && <div className="loading-indicator" />}
    </div>
  );
};

export default PreviewRenderer;

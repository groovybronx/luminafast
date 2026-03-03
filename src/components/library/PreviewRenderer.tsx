/**
 * Composant PreviewRenderer — Phase 4.2 (CSS + WASM Rendering)
 * Affiche un aperçu d'image avec filtres appliqués en temps réel
 * Phase A: CSS filters (toujours disponible)
 * Phase B: WASM pixel processing (optionnel, activation via useWasm=true)
 */

import { useEffect, useRef, useState } from 'react';
import { applyCSSFilters, eventsToPixelFilters } from '@/services/renderingService';
import { loadWasmModule, hasWasmSupport, renderWithWasm } from '@/services/wasmRenderingService';
import { CatalogService } from '@/services/catalogService';
import { useEditStore } from '@/stores/editStore';
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
  const [wasmAvailable, setWasmAvailable] = useState(false);
  const [useWasmMode, setUseWasmMode] = useState(useWasm);

  // Get edit store actions + selector for subscription
  const setEditEventsForImage = useEditStore((state) => state.setEditEventsForImage);
  const clearEditEventsForImage = useEditStore((state) => state.clearEditEventsForImage);
  const editEventsForImage = useEditStore((state) => state.editEventsPerImage[imageId]);

  // Initialize WASM module on mount
  useEffect(() => {
    if (!useWasm) return;

    loadWasmModule()
      .then(() => {
        setWasmAvailable(hasWasmSupport());
        if (import.meta.env.DEV) {
          console.warn('[PreviewRenderer] WASM module loaded successfully');
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[PreviewRenderer] WASM module failed to load:', err);
        }
        setWasmAvailable(false);
      });
  }, [useWasm]);

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
    if (!useWasmMode && imgRef.current) {
      applyCSSFilters(imgRef.current, {
        exposure: pixelFilters.exposure,
        contrast: pixelFilters.contrast,
        saturation: pixelFilters.saturation,
      });
    }
  }, [pixelFilters, useWasmMode]);

  // Render WASM canvas (Phase B) when filters change
  useEffect(() => {
    if (!useWasmMode || !canvasRef.current || !wasmAvailable) return;

    const renderFrame = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        await renderWithWasm(
          canvas,
          previewUrl,
          pixelFilters,
          1440, // Standard preview width
          1440, // Standard preview height
        );
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[PreviewRenderer] WASM render failed, falling back to CSS:', err);
        }
        // Fallback: show image avec CSS filters
        setUseWasmMode(false);
      }
    };

    // PERF: Debounce rendering (300ms) to avoid multiple renders during slider movement
    // Without debounce: slider change -100→+10 triggers 110 renders (one per value change)
    // With debounce: only 1 render 300ms after slider release
    const debounceTimer = setTimeout(() => {
      renderFrame();
    }, 300);

    // Cleanup: cancel timeout if effect runs again
    return () => clearTimeout(debounceTimer);
  }, [pixelFilters, previewUrl, useWasmMode, wasmAvailable]);

  // Monitor EditStore changes and update filters reactively (all 9 filters for WASM)
  useEffect(() => {
    if (editEventsForImage && editEventsForImage.length > 0) {
      const allPixelFilters = eventsToPixelFilters(editEventsForImage);
      setPixelFilters(allPixelFilters);
    }
  }, [editEventsForImage, imageId]);

  return (
    <div
      ref={containerRef}
      className={`preview-renderer${isSelected ? ' selected' : ''}${error ? ' error' : ''}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Phase B: WASM Canvas (hidden if not active) */}
      {useWasmMode && wasmAvailable && (
        <canvas
          ref={canvasRef}
          className={className}
          data-testid={`preview-renderer-canvas-${imageId}`}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      )}

      {/* Phase A: CSS Filtered Image (fallback or CSS-only mode) */}
      {!useWasmMode && (
        <img
          ref={imgRef}
          src={previewUrl}
          alt={`Preview for image ${imageId}`}
          className={className}
          data-testid={`preview-renderer-img-${imageId}`}
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

/**
 * Composant PreviewRenderer — Phase A (CSS Filters)
 * Affiche un aperçu d'image avec les filtres CSS appliqués en temps réel
 * Phase 4.2 — Pipeline de Rendu Image
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { applyCSSFilters, eventsToPixelFilters } from '@/services/renderingService';
import { renderWithWasm } from '@/services/wasmRenderingService';
import { useEditStore } from '@/stores/editStore';
import { useSystemStore } from '@/stores/systemStore';
import type { CSSFilterState, PixelFilterState } from '@/types/rendering';

interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean; // Phase B: toggle WASM vs CSS fallback
}

/**
 * Composant React pour afficher une image avec filtres CSS appliqués
 * Lit les événements Event Sourcing et applique les transformations en temps réel
 *
 * @example
 * <PreviewRenderer
 *   imageId={123}
 *   previewUrl="/previews/abc123.jpg"
 *   isSelected={true}
 *   className="thumbnail"
 * />
 */
export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  imageId,
  previewUrl,
  className = '',
  isSelected = false,
  useWasm = false,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadEditEvents = useEditStore((state) => state.loadEditEvents);
  const editEvents = useEditStore((state) => state.editEventsByImage[imageId] ?? []);
  const [useWasmRenderer, setUseWasmRenderer] = useState(useWasm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addLog = useSystemStore((state) => state.addLog);

  const appliedEdits: PixelFilterState = useMemo(
    () => eventsToPixelFilters(editEvents),
    [editEvents],
  );

  const cssFilters: CSSFilterState = useMemo(
    () => ({
      exposure: appliedEdits.exposure,
      contrast: appliedEdits.contrast,
      saturation: appliedEdits.saturation,
    }),
    [appliedEdits],
  );

  useEffect(() => {
    setUseWasmRenderer(useWasm);
  }, [useWasm]);

  // Load and apply filters on mount and when imageId changes
  useEffect(() => {
    let isMounted = true;

    const loadFilters = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await loadEditEvents(imageId);
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
    };
  }, [imageId, loadEditEvents]);

  // Apply CSS filters to DOM element when they change
  useEffect(() => {
    if (useWasmRenderer) {
      return;
    }
    applyCSSFilters(imgRef.current, cssFilters);
  }, [cssFilters, useWasmRenderer]);

  // Render with WASM when enabled
  useEffect(() => {
    if (!useWasmRenderer) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    // Avoid rendering with undersized canvases (e.g. not yet laid out)
    if (width <= 1 || height <= 1) {
      if (import.meta.env.DEV) {
        console.warn(
          `[PreviewRenderer] Skipping WASM render for image ${imageId} due to small canvas size: ${width}x${height}`,
        );
      }
      return;
    }
    setIsLoading(true);
    setError(null);

    renderWithWasm(canvas, previewUrl, appliedEdits, width, height)
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        setUseWasmRenderer(false);
        // Log développeur
        console.warn(`[PreviewRenderer] WASM render failed for image ${imageId}:`, err);
        // Log système pour ArchitectureMonitor
        addLog(
          `Rendu WASM indisponible pour image ${imageId} : fallback CSS activé (${errorMsg})`,
          'error',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [appliedEdits, imageId, previewUrl, useWasmRenderer, addLog]);

  return (
    <div className={`preview-renderer${isSelected ? ' selected' : ''}${error ? ' error' : ''}`}>
      {useWasmRenderer ? (
        <canvas ref={canvasRef} className={className} data-testid={`preview-renderer-${imageId}`} />
      ) : (
        <img
          ref={imgRef}
          src={previewUrl}
          alt={`Preview for image ${imageId}`}
          className={className}
          data-testid={`preview-renderer-${imageId}`}
          onError={() => {
            setError('Failed to load image');
            if (import.meta.env.DEV) {
              console.error(`[PreviewRenderer] Image load error: ${previewUrl}`);
            }
          }}
        />
      )}
      {error && (
        <div
          title={error}
          style={{
            position: 'absolute',
            background: 'rgba(255,0,0,0.3)',
            zIndex: 10,
            padding: '4px',
            borderRadius: '4px',
            color: '#900',
            fontWeight: 'bold',
            fontSize: '0.9em',
          }}
        >
          ⚠️ Rendu WASM indisponible&nbsp;: fallback CSS activé
          <br />
          <span style={{ fontSize: '0.8em' }}>{error}</span>
        </div>
      )}
      {isLoading && <div className="loading-indicator" />}
    </div>
  );
};

export default PreviewRenderer;

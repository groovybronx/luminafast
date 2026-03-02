/**
 * Composant PreviewRenderer — Phase A (CSS Filters)
 * Affiche un aperçu d'image avec les filtres CSS appliqués en temps réel
 * Phase 4.2 — Pipeline de Rendu Image
 */

import { useEffect, useRef, useState } from 'react';
import { eventsToCSSFilters, applyCSSFilters } from '@/services/renderingService';
import { CatalogService } from '@/services/catalogService';
import { useEditStore } from '@/stores/editStore';
import type { CSSFilterState } from '@/types/rendering';

interface PreviewRendererProps {
  imageId: number;
  previewUrl: string;
  className?: string;
  isSelected?: boolean;
  useWasm?: boolean; // Phase B: toggle WASM vs CSS fallback (not used in Phase A)
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
  useWasm: _useWasm = false, // Phase B will use this
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [filters, setFilters] = useState<CSSFilterState>({
    exposure: 0,
    contrast: 0,
    saturation: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get edit store actions + selector for subscription (Phase 4.2-B.2)
  const setEditEventsForImage = useEditStore((state) => state.setEditEventsForImage);
  const clearEditEventsForImage = useEditStore((state) => state.clearEditEventsForImage);
  const editEventsForImage = useEditStore((state) => state.editEventsPerImage[imageId]);

  // Load and apply filters on mount and when imageId changes
  useEffect(() => {
    let isMounted = true;

    const loadFilters = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupérer les événements pour cette image depuis Event Sourcing (Phase 4.2-B.1)
        const imageEvents = await CatalogService.getEditEvents(imageId);

        // Stocker dans EditStore (Phase 4.2-B.2)
        if (isMounted) {
          setEditEventsForImage(imageId, imageEvents);
        }

        // Convertir en filtres CSS
        const cssFilters = eventsToCSSFilters(imageEvents);

        if (isMounted) {
          setFilters(cssFilters);
          if (import.meta.env.DEV) {
            console.warn(
              `[PreviewRenderer] Loaded ${imageEvents.length} events for imageId=${imageId}`,
            );
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (isMounted) {
          setError(errorMsg);
          // Log mais ne pas fail l'affichage de l'image
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
      // Cleanup: clear stored events for this image when component unmounts
      clearEditEventsForImage(imageId);
    };
  }, [imageId, setEditEventsForImage, clearEditEventsForImage]);

  // Apply filters to DOM element when they change
  useEffect(() => {
    applyCSSFilters(imgRef.current, filters);
  }, [filters]);

  // Phase 4.2-2: Monitor editStore changes for this image
  // When events change (e.g., new EDIT event from App.tsx), recalculate filters
  useEffect(() => {
    if (editEventsForImage && editEventsForImage.length > 0) {
      const cssFilters = eventsToCSSFilters(editEventsForImage);
      setFilters(cssFilters);
      if (import.meta.env.DEV) {
        console.warn(
          `[PreviewRenderer] Updated filters from store: ${editEventsForImage.length} events for imageId=${imageId}`,
        );
      }
    }
  }, [editEventsForImage, imageId]);

  return (
    <div className={`preview-renderer${isSelected ? ' selected' : ''}${error ? ' error' : ''}`}>
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
      {error && import.meta.env.DEV && (
        <div title={error} style={{ position: 'absolute', background: 'rgba(255,0,0,0.3)' }}>
          ⚠️
        </div>
      )}
      {isLoading && <div className="loading-indicator" />}
    </div>
  );
};

export default PreviewRenderer;

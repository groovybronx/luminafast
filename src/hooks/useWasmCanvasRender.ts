/**
 * useWasmCanvasRender.ts — Hook React pour rendu WASM sur canvas
 * (Phase 4.4-B Maintenance - Extraction logique répétée)
 * (Maintenance refactoring - Accepte PixelFilterState directement)
 * (Responsive support - Accepte dimensions max optionnelles)
 *
 * Encapsule la logique partagée entre les composants :
 * - Chargement de l'image source
 * - Détermination des dimensions (adaptées aux contraintes max)
 * - Conversion optionnelle des filtres (si EditState reçu)
 * - Appel à renderWithWasm() si modifications présentes
 * - Fallback: dessin direct si pas de filtres
 */

import type { RefObject } from 'react';
import { useEffect } from 'react';
import { renderWithWasm } from '@/services/wasmRenderingService';
import { editStateToPixelFilters, hasNonNeutralFilters } from '@/lib/filterUtils';
import type { EditState } from '@/types';
import type { PixelFilterState } from '@/types/rendering';

/**
 * Hook personnalisé pour rendu WASM d'une image sur un canvas
 * Gère automatiquement le chargement, dimensionnement et rendu
 *
 * @param canvasRef - Référence au canvas HTML cible
 * @param imageUrl - URL de l'image source (peut être undefined)
 * @param filters - État des modifications : EditState (EditEvent[]) ou PixelFilterState
 * @param maxWidth - Largeur maximale disponible (optionnel, pour responsive)
 * @param maxHeight - Hauteur maximale disponible (optionnel, pour responsive)
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * useWasmCanvasRender(canvasRef, afterUrl, pixelFilters, 1440, 1080);
 */
export function useWasmCanvasRender(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  imageUrl: string | undefined,
  filters: EditState | PixelFilterState | undefined,
  maxWidth?: number,
  maxHeight?: number,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const renderImage = async () => {
      try {
        // Créer une image temporaire pour déterminer les dimensions
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = async () => {
          // Calculer la taille adaptée du canvas si des contraintes max sont fournies
          let canvasWidth = img.width;
          let canvasHeight = img.height;

          if ((maxWidth && maxWidth > 0) || (maxHeight && maxHeight > 0)) {
            // Appliquer les contraintes de taille max en respectant l'aspect ratio
            const aspectRatio = img.width / img.height;

            if (maxWidth && img.width > maxWidth) {
              canvasWidth = maxWidth;
              canvasHeight = Math.round(maxWidth / aspectRatio);
            }

            if (maxHeight && canvasHeight > maxHeight) {
              canvasHeight = maxHeight;
              canvasWidth = Math.round(maxHeight * aspectRatio);
            }
          }

          // Dimensionner le canvas aux dimensions calculées
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          // Déterminer le type de filtres reçu et convertir si nécessaire
          let pixelFilters: PixelFilterState;
          if (Array.isArray(filters)) {
            // EditState (EditEvent[]) → convertir en PixelFilterState
            pixelFilters = editStateToPixelFilters(filters as EditState);
          } else if (filters && typeof filters === 'object') {
            // Déjà PixelFilterState (objet avec exposure, contrast, etc.)
            pixelFilters = filters as PixelFilterState;
          } else {
            // Undefined ou invalide → utiliser filtres neutres
            pixelFilters = editStateToPixelFilters(undefined);
          }

          // Déterminer si des filtres non-neutres sont appliqués
          if (hasNonNeutralFilters(pixelFilters)) {
            // Utiliser WASM pour le rendu avec filtres appliqués
            await renderWithWasm(canvas, imageUrl, pixelFilters, canvasWidth, canvasHeight);
          } else {
            // Fallback : dessiner l'image sans filtres
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            }
          }
        };

        img.onerror = () => {
          console.error(`[useWasmCanvasRender] Impossible de charger l'image: ${imageUrl}`);
        };

        img.src = imageUrl;
      } catch (error) {
        console.error('[useWasmCanvasRender] Erreur lors du rendu WASM:', error);
      }
    };

    renderImage();
  }, [canvasRef, imageUrl, filters, maxWidth, maxHeight]);
}

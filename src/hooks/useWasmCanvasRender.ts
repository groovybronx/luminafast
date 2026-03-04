/**
 * useWasmCanvasRender.ts — Hook React pour rendu WASM sur canvas
 * (Phase 4.4-B Maintenance - Extraction logique répétée)
 *
 * Encapsule la logique partagée entre les 3 composants de comparaison :
 * - Chargement de l'image source
 * - Détermination des dimensions
 * - Conversion des filtres UI
 * - Appel à renderWithWasm() si modifications présentes
 * - Fallback: dessin direct si pas de filtres
 */

import type { RefObject } from 'react';
import { useEffect } from 'react';
import { renderWithWasm } from '@/services/wasmRenderingService';
import { editStateToPixelFilters, hasNonNeutralFilters } from '@/lib/filterUtils';
import type { EditState } from '@/types';

/**
 * Hook personnalisé pour rendu WASM d'une image sur un canvas
 * Gère automatiquement le chargement, dimensionnement et rendu
 *
 * @param canvasRef - Référence au canvas HTML cible
 * @param imageUrl - URL de l'image source (peut être undefined)
 * @param editState - État des modifications (filtres) à appliquer
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * useWasmCanvasRender(canvasRef, afterUrl, editState);
 */
export function useWasmCanvasRender(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  imageUrl: string | undefined,
  editState: EditState | undefined,
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
          // Dimensionner le canvas aux dimensions de l'image
          canvas.width = img.width;
          canvas.height = img.height;

          // Convertir EditState → PixelFilterState (centralisé dans filterUtils)
          const pixelFilters = editStateToPixelFilters(editState);

          // Déterminer si des filtres non-neutres sont appliqués
          if (hasNonNeutralFilters(pixelFilters)) {
            // Utiliser WASM pour le rendu avec filtres appliqués
            await renderWithWasm(canvas, imageUrl, pixelFilters, img.width, img.height);
          } else {
            // Fallback : dessiner l'image sans filtres
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
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
  }, [canvasRef, imageUrl, editState]);
}

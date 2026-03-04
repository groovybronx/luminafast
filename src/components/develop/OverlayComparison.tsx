/**
 * Composant OverlayComparison — Mode Overlay (Phase 4.4-B)
 * Superpose deux images avec contrôle d'opacité
 * Arrière-plan: Image RAW originale
 * Overlay: Canvas WASM avec filtres appliqués
 */

import { useCallback, useRef, useEffect } from 'react';
import { renderWithWasm, normalizeFiltersForWasm } from '@/services/wasmRenderingService';
import type { OverlayComparisonProps } from '@/types';
import type { PixelFilterState } from '@/types/rendering';

export const OverlayComparison = ({
  beforeUrl,
  afterUrl,
  opacity,
  onOpacityChange,
  editState,
}: OverlayComparisonProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOpacityChange(parseInt(e.target.value, 10));
    },
    [onOpacityChange],
  );

  // Rendu WASM du canvas overlay avec filtres appliqués
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !afterUrl) return;

    const renderImage = async () => {
      try {
        // Charger l'image pour connaître ses dimensions
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
          // Dimensionner le canvas
          canvas.width = img.width;
          canvas.height = img.height;

          // Convertir EditState à PixelFilterState et appliquer WASM
          const normalizedFilters: PixelFilterState = {
            exposure: editState?.exposure ?? 0,
            contrast: editState?.contrast ?? 0,
            saturation: editState?.saturation ?? 0,
            highlights: editState?.highlights ?? 0,
            shadows: editState?.shadows ?? 0,
            clarity: editState?.clarity ?? 0,
            vibrance: editState?.vibrance ?? 0,
            colorTemp: editState?.temp ?? 5500,
            tint: editState?.tint ?? 0,
          };

          const wasmFilters = normalizeFiltersForWasm(normalizedFilters);

          // Appliquer WASM si editState existe et contient des modifications
          if (editState && Object.values(editState).some((v) => v !== 0 && v !== undefined)) {
            await renderWithWasm(canvas, afterUrl, wasmFilters, img.width, img.height);
          } else {
            // Fallback: Dessiner l'image sans filtres
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
            }
          }
        };
        img.src = afterUrl;
      } catch (error) {
        console.error('Erreur WASM OverlayComparison:', error);
      }
    };

    renderImage();
  }, [afterUrl, editState]);

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950">
      {/* Images superposées */}
      <div className="flex-1 relative overflow-hidden">
        {/* Image "Avant" (fond) - RAW original */}
        <img
          src={beforeUrl}
          className="absolute inset-0 w-full h-full object-contain"
          alt="Original RAW"
        />

        {/* Badge "Original RAW" */}
        <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-xs font-bold text-white rounded-md shadow-lg border border-zinc-700 z-10">
          Original RAW
        </div>

        {/* Canvas "Après" (overlay WASM, avec opacité) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: opacity / 100 }}
        />

        {/* Badge "Aperçu WASM" */}
        <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 text-xs font-bold text-white rounded-md shadow-lg z-10">
          Aperçu WASM
        </div>
      </div>

      {/* Slider pour opacité */}
      <div className="shrink-0 p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="flex items-center gap-4">
          <label className="text-sm text-zinc-300 whitespace-nowrap">Transparence</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={handleChange}
            className="flex-1"
            aria-label="Image opacity"
          />
          <span className="text-sm text-zinc-400 w-8 text-right tabular-nums">{opacity}%</span>
        </div>
      </div>
    </div>
  );
};

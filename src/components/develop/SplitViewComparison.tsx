/**
 * Composant SplitViewComparison — Mode Split-View (Phase 4.4-B)
 * Affiche deux images côte-à-côte avec séparateur glissable
 * Gauche: Original RAW (sans filtres)
 * Droite: Canvas WASM avec filtres appliqués (editState)
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { renderWithWasm, normalizeFiltersForWasm } from '@/services/wasmRenderingService';
import type { SplitViewComparisonProps } from '@/types';
import type { PixelFilterState } from '@/types/rendering';

export const SplitViewComparison = ({
  beforeUrl,
  afterUrl,
  position,
  onPositionChange,
  editState,
}: SplitViewComparisonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Gestion du début du drag sur le séparateur
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Gestion de la fin du drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Gestion du mouvement de la souris
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newPos = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPos = Math.max(0, Math.min(100, newPos));

      onPositionChange(clampedPos);
    },
    [isDragging, onPositionChange],
  );

  // Ajouter/retirer les listeners de mouvement lorsque isDragging change
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Rendu WASM de l'image après avec filtres appliqués
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
        console.error('Erreur WASM SplitView:', error);
      }
    };

    renderImage();
  }, [afterUrl, editState]);

  return (
    <div ref={containerRef} className="flex w-full h-full overflow-hidden bg-zinc-950">
      {/* Image "Avant" (gauche) - RAW original sans filtres */}
      <div style={{ width: `${position}%` }} className="shrink-0 overflow-hidden relative">
        <img src={beforeUrl} className="w-full h-full object-contain" alt="Original RAW" />
        <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-xs font-bold text-white rounded-md shadow-lg border border-zinc-700">
          Original RAW
        </div>
      </div>

      {/* Séparateur glissable (slider pour position split) */}
      <button
        onMouseDown={handleMouseDown}
        className={`w-1 shrink-0 bg-blue-600 cursor-col-resize hover:bg-blue-400 transition-colors ${
          isDragging ? 'bg-blue-300 w-2' : ''
        }`}
        aria-label={`Split view position: ${Math.round(position)}%`}
        type="button"
      />

      {/* Image "Après" (droite) - Canvas WASM avec filtres */}
      <div style={{ width: `${100 - position}%` }} className="shrink-0 overflow-hidden relative">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 text-xs font-bold text-white rounded-md shadow-lg">
          Aperçu WASM
        </div>
      </div>
    </div>
  );
};

/**
 * Composant SideBySideComparison — Mode Side-by-Side (Phase 4.4-B)
 * Deux images empilées avec zoom/pan synchronisés
 * Haut: Image RAW originale (sans filtres)
 * Bas: Canvas WASM avec filtres appliqués
 */

import { useCallback, useState, useRef } from 'react';
import { useWasmCanvasRender } from '@/hooks/useWasmCanvasRender';
import type { SideBySideComparisonProps } from '@/types';

export const SideBySideComparison = ({
  beforeUrl,
  afterUrl,
  editState,
  containerRef,
}: SideBySideComparisonProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Gestion du zoom par scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // 0.9 pour zoom out, 1.1 pour zoom in
    setZoom((prev) => Math.max(1, Math.min(5, prev * delta)));
  }, []);

  // Début du drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    },
    [panX, panY],
  );

  // Mouvement du drag
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    },
    [isDragging, dragStart],
  );

  // Fin du drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Rendu WASM du canvas bas avec filtres appliqués
  useWasmCanvasRender(canvasRef, afterUrl, editState);

  // Transformation CSS appliquée aux deux images
  const transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="flex flex-col w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Image "Avant" (haut) - RAW original */}
      <div className="flex-1 overflow-hidden relative border-b border-zinc-800 bg-zinc-950">
        <div style={{ transform }} className="w-full h-full origin-center">
          <img
            src={beforeUrl || undefined}
            className="w-full h-full object-contain"
            alt="Original RAW"
          />
        </div>
        <div className="absolute top-4 left-4 text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded border border-zinc-700">
          Original RAW
        </div>
        <div className="absolute top-4 right-4 text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded border border-zinc-700 font-mono">
          {zoom.toFixed(2)}x
        </div>
      </div>

      {/* Canvas "Après" (bas) - WASM avec filtres */}
      <div className="flex-1 overflow-hidden relative bg-zinc-950">
        <div style={{ transform }} className="w-full h-full origin-center">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-4 left-4 text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded border border-zinc-700">
          Aperçu WASM
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded border border-zinc-700">
          Scroll pour zoomer • Drag pour translater
        </div>
      </div>
    </div>
  );
};

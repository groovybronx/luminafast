/**
 * Composant BeforeAfterComparison — Container Principal (Phase 4.4-C)
 * Gère le routage entre les 3 modes de comparaison
 */

import { useMemo, useRef } from 'react';
import { SplitViewComparison } from './SplitViewComparison';
import { OverlayComparison } from './OverlayComparison';
import { SideBySideComparison } from './SideBySideComparison';
import type { BeforeAfterComparisonProps, ComparisonMode } from '@/types';

export const BeforeAfterComparison = ({
  afterUrl,
  beforeUrl,
  imageId,
  mode,
  onModeChange,
  opacity,
  onOpacityChange,
  splitPosition,
  onSplitPositionChange,
  editState,
}: BeforeAfterComparisonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoïser les objets pour éviter les re-renders inutiles
  const modes: Array<{ id: ComparisonMode; label: string }> = useMemo(
    () => [
      { id: 'split', label: 'Split' },
      { id: 'overlay', label: 'Overlay' },
      { id: 'sideBySide', label: 'Side-by-Side' },
    ],
    [],
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full bg-zinc-950"
      key={`comparison-${imageId}`}
    >
      {/* Sélecteur de modes (haut) */}
      <div className="shrink-0 p-3 bg-zinc-900 border-b border-zinc-800 flex gap-2">
        {modes.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              mode === id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            type="button"
            data-pressed={mode === id}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenu (rendu du mode sélectionné) */}
      <div className="flex-1 overflow-hidden">
        {/* Mode Split-View */}
        {mode === 'split' && (
          <SplitViewComparison
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            position={splitPosition}
            onPositionChange={onSplitPositionChange}
            editState={editState}
          />
        )}

        {/* Mode Overlay */}
        {mode === 'overlay' && (
          <OverlayComparison
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            opacity={opacity}
            onOpacityChange={onOpacityChange}
            editState={editState}
          />
        )}

        {/* Mode Side-by-Side */}
        {mode === 'sideBySide' && (
          <SideBySideComparison
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            editState={editState}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
          />
        )}
      </div>
    </div>
  );
};

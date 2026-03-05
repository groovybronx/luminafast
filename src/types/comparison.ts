/**
 * Types pour le module Comparaison Avant/Après (Phase 4.4)
 * Supporte 3 modes: split-view, overlay, side-by-side avec WASM
 */

import type { EditState } from './image';

export type ComparisonMode = 'split' | 'overlay' | 'sideBySide';

/**
 * Props du composant BeforeAfterComparison (container principal)
 * Gère le routage vers le bon mode et l'état partagé
 */
export interface BeforeAfterComparisonProps {
  imageId: number;
  beforeUrl: string;
  afterUrl: string;
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  splitPosition: number; // 0-100, position du séparateur vertical
  onSplitPositionChange: (position: number) => void;
  opacity: number; // 0-100, opacité de l'image "Après"
  onOpacityChange: (opacity: number) => void;
  editState?: EditState; // Filtres WASM appliqués à l'image "Après"
}

/**
 * Props du mode Split-View
 * Deux images côte-à-côte avec séparateur glissable
 * Gauche: Image RAW originale (sans filtres)
 * Droite: Image avec filtres appliqués via WASM
 */
export interface SplitViewComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  position: number; // 0-100, pourcentage de la largeur pour l'image avant
  onPositionChange: (position: number) => void;
  editState?: EditState;
}

/**
 * Props du mode Overlay
 * Image "Après" superposée avec contrôle d'opacité
 * Image "Avant" en arrière-plan (RAW)
 * Canvas avec WASM en overlay pour appliquer les filtres
 */
export interface OverlayComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  opacity: number; // 0-100, opacité de l'image "Après"
  onOpacityChange: (opacity: number) => void;
  editState?: EditState;
}

/**
 * Props du mode Side-by-Side
 * Deux images empilées (vertical) avec zoom/pan synchronisés
 * Haut: Image RAW originale
 * Bas: Canvas WASM avec filtres appliqués
 */
export interface SideBySideComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  editState?: EditState;
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Props du sélecteur de modes
 * Composant optionnel pour choisir le mode actif
 */
export interface ComparisonModeSelectorProps {
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
}

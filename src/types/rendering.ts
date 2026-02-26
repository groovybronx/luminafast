/**
 * Types pour le système de rendu des images
 * Phase 4.2 — Pipeline de Rendu Image
 */

/**
 * État des filtres CSS (Phase A)
 * Conversion directe de EditState vers propriétés CSS standards
 */
export interface CSSFilterState {
  exposure: number; // -2.0 à +2.0 (mapped to brightness)
  contrast: number; // -1.0 à +3.0 (mapped to contrast)
  saturation: number; // 0.0 à 2.0 (mapped to saturate)
}

/**
 * État des filtres pixel (Phase B)
 * Extension de CSSFilterState avec filtres avancés traités en WASM
 */
export interface PixelFilterState extends CSSFilterState {
  highlights: number; // -1.0 à +1.0
  shadows: number; // -1.0 à +1.0
  clarity: number; // -100 à +100
  vibrance: number; // -100 à +100
  colorTemp: number; // 2000K à 10000K
  tint: number; // -50 à +50
  curves?: CurvePoint[]; // Tone curves (optional)
}

/**
 * Point sur une courbe de tons (Phase B)
 */
export interface CurvePoint {
  x: number; // Input value (0-255)
  y: number; // Output value (0-255)
}

/**
 * Contexte de rendu (métadonnées + paramètres)
 */
export interface RenderContext {
  imageId: number;
  previewUrl: string;
  useWasm?: boolean; // Phase B: toggle WASM vs CSS fallback
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Résultat de rendu (pour benchmarking et diagnostique)
 */
export interface RenderResult {
  method: 'css' | 'wasm'; // Quelle technique a été utilisée
  latencyMs: number; // Temps de rendu en ms
  success: boolean;
  error?: string;
}

/**
 * Erreur de traitement d'image
 */
export class RenderingError extends Error {
  constructor(
    message: string,
    public readonly code: 'WASM_NOT_AVAILABLE' | 'CANVAS_ERROR' | 'IMAGE_LOAD_ERROR',
  ) {
    super(message);
    this.name = 'RenderingError';
  }
}

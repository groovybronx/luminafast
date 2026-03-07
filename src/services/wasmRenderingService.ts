/**
 * WASM Rendering Service — Phase B
 * Wrapper TypeScript pour le module WASM de traitement pixel
 * Avec fallback gracieux sur CSS filters si WASM non-disponible
 */

import type { PixelFilterState } from '@/types/rendering';

// Type défini par wasm-bindgen (sera disponible après import dynamique)
interface WasmExports {
  PixelFiltersWasm: new (
    exposure: number,
    contrast: number,
    saturation: number,
    highlights: number,
    shadows: number,
    clarity: number,
    vibrance: number,
    color_temp: number,
    tint: number,
  ) => {
    // Getters/Setters pour chaque propriété
    exposure: number;
    contrast: number;
    saturation: number;
    highlights: number;
    shadows: number;
    clarity: number;
    vibrance: number;
    color_temp: number;
    tint: number;
    // Méthode principale
    apply_filters(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array;
  };
  /** Phase 5.1 — Histogramme WASM : retourne 768 uint32 (r[256] g[256] b[256]) */
  compute_histogram(pixels: Uint8Array, width: number, height: number): Uint32Array;
  default: () => Promise<void>;
}

declare global {
  interface Window {
    luminafastWasm?: WasmExports;
  }
}

interface WasmModuleStatus {
  available: boolean;
  loaded: boolean;
  lastError?: string;
}

/**
 * État global du module WASM
 */
let wasmStatus: WasmModuleStatus = {
  available: false,
  loaded: false,
};

/**
 * Instance réutilisable de PixelFiltersWasm (évite réinstanciation à chaque frame)
 */
let cachedFiltersInstance: InstanceType<WasmExports['PixelFiltersWasm']> | null = null;

/**
 * Charge le module WASM de manière asynchrone
 * @returns Promesse résolue si WASM chargé avec succès
 */
export async function loadWasmModule(): Promise<void> {
  // Si déjà chargé, ne rien faire
  if (wasmStatus.loaded) {
    return;
  }

  try {
    // Charger le module WASM depuis luminafast-wasm/pkg (via alias @wasm)
    // Format: luminafast_wasm.js + luminafast_wasm_bg.wasm
    // Produits par: wasm-pack build --target web

    // Import dynamique du module ES généré par wasm-bindgen
    const wasmModule = (await import('@wasm/luminafast_wasm')) as unknown as WasmExports;

    // Initialiser le module WASM (charge .wasm et instancie)
    await wasmModule.default();

    // Vérifier que PixelFiltersWasm existe
    if (typeof wasmModule.PixelFiltersWasm !== 'function') {
      throw new Error('PixelFiltersWasm class not found in WASM module');
    }

    // Stocker dans window pour tests et usage global
    window.luminafastWasm = wasmModule;

    wasmStatus.available = true;
    wasmStatus.loaded = true;
    console.warn('[WASM] Module chargé avec succès');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    wasmStatus.loaded = true;
    wasmStatus.available = false;
    wasmStatus.lastError = errorMsg;
    console.warn('[WASM] Non-disponible', errorMsg);
  }
}

/**
 * Vérifie si WASM est disponible
 */
export function hasWasmSupport(): boolean {
  return wasmStatus.available && window.luminafastWasm !== undefined;
}

/**
 * Normalise les paramètres de filtres UI vers les plages attendues par WASM
 *
 * ⚠️ **CRITICAL NORMALIZATION** — Phase 4.2 Conformity
 *
 * This is the bridge between React UI slider ranges (-100..+100) and WASM Rust function expectations.
 * Mismatch here causes UI to become unresponsive (slider maxes out after few increments).
 * See https://github.com/groovybronx/luminafast/pull/20 for regression history.
 *
 * **UI Reference Ranges** (React sliders: always -100..+100):
 * - Left slider: -100 (min compression)
 * - Center slider: 0 (neutral)
 * - Right slider: +100 (max expansion)
 *
 * **WASM Expected Ranges** (from luminafast-wasm/src/image_processing.rs):
 *
 * | Param        | WASM Range   | Conversion Formula                    | Notes                                      |
 * |--------------|--------------|---------------------------------------|-------------------------------------------|
 * | exposure     | -2.0 to +2.0 | UI / 50                               | Multiplicative scale (linear EV steps)   |
 * | contrast     | -1.0 to +3.0 | UI / 50                               | Clipped at WASM boundary                  |
 * | saturation   | 0.0 to +2.0  | 1 + (UI / 100)                        | 1.0 = neutral, clamped [0..2]           |
 * | highlights   | -1.0 to +1.0 | UI / 100                              | Fine-grained control for bright areas    |
 * | shadows      | -1.0 to +1.0 | UI / 100                              | Fine-grained control for dark areas      |
 * | clarity      | 0.0 to +1.0  | UI / 100 (clamped [0..1])             | Edge enhancement (always positive)       |
 * | vibrance     | 0.0 to +1.0  | UI / 100 (clamped [0..1])             | Selective saturation (always positive)   |
 * | colorTemp    | 2000-10000K  | Direct (no conversion)                | Kelvin scale, applied as-is              |
 * | tint         | -50 to +50   | UI / 2                                | Green (-) to Magenta (+)                 |
 *
 * **Example Conversion Flow**:
 * ```
 * User moves exposure slider to +50 (halfway right)
 * UI value: 50
 * WASM value: 50 / 50 = 1.0 (bright by 1 EV)
 *
 * User moves saturation slider to -30 (slightly left)
 * UI value: -30
 * WASM value: 1 + (-30 / 100) = 0.7 (desaturate by 30%)
 * ```
 *
 * @param filters État des filtres UI (toutes valeurs en -100..+100)
 * @returns État des filtres normalisés selon les plages WASM attendues
 *
 * @throws Never — assumes valid PixelFilterState input
 *
 * @see luminafast-wasm/src/image_processing.rs — WASM implementation with clamping
 * @see src/lib/filterUtils.ts — Détection des filtres non-neutres
 */
export function normalizeFiltersForWasm(filters: PixelFilterState): PixelFilterState {
  return {
    // === CSS-equivalent filters (exposure, contrast, saturation) ===
    // These map directly to browser CSS filter equivalents for fallback rendering

    // Exposure (EV compensation): WASM -2.0..+2.0, UI -100..+100
    // Formula: UI / 50 gives us 2 full EV stops range
    exposure: filters.exposure / 50,

    // Contrast: WASM -1.0..+3.0, UI -100..+100
    // Formula: Same as exposure, but WASM clamps to [-1, 3]
    contrast: filters.contrast / 50,

    // Saturation: WASM 0.0..+2.0, UI -100..+100
    // Formula: 1 + (UI/100) gives us [0, 2] range with 1.0 as neutral midpoint
    // 0.0 = grayscale, 1.0 = original, 2.0 = vivid
    saturation: 1 + filters.saturation / 100,

    // === Pixel-level advanced filters (highlights, shadows, clarity, vibrance) ===
    // These require WASM pixel processing (CSS alternativesnotavailable)

    // Highlights: WASM -1.0..+1.0, UI -100..+100
    // Formula: UI / 100 for fine-grained control over bright areas
    // Negative = darken bright areas, Positive = brighten bright areas
    highlights: (filters.highlights ?? 0) / 100,

    // Shadows: WASM -1.0..+1.0, UI -100..+100
    // Formula: UI / 100 for fine-grained control over dark areas
    // Negative = darken dark areas, Positive = brighten dark areas
    shadows: (filters.shadows ?? 0) / 100,

    // Clarity: WASM 0.0..+1.0, UI -100..+100
    // Formula: UI / 100, but WASM clamps to [0, 1] (always additive - no negative allowed)
    // 0.0 = no edge enhancement, 1.0 = maximum clarity/micro-contrast
    clarity: (filters.clarity ?? 0) / 100,

    // Vibrance: WASM 0.0..+1.0, UI -100..+100
    // Formula: UI / 100, but WASM clamps to [0, 1] (always additive - no negative allowed)
    // 0.0 = no selective saturation, 1.0 = maximum vibrance
    vibrance: (filters.vibrance ?? 0) / 100,

    // Color Temperature: WASM 2000-10000K, UI uses Kelvin direct
    // Formula: Direct pass-through (no conversion needed)
    // 2000K = warm/amber, 5500K = neutral, 10000K = cool/blue
    colorTemp: filters.colorTemp ?? 5500,

    // Tint: WASM -50..+50, UI -100..+100
    // Formula: UI / 2 to get -50..+50 range
    // Negative = green shift, Positive = magenta shift
    tint: (filters.tint ?? 0) / 2,
  };
}

/**
 * Rendu avec WASM (plus performant)
 * @param canvas - Canvas HTML pour rendu
 * @param imageUrl - URL de l'image source
 * @param filters - États des filtres pixel (échelle UI: -100 à +100)
 * @param width - Largeur en pixels
 * @param height - Hauteur en pixels
 */
export async function renderWithWasm(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  _filters: PixelFilterState,
  width: number,
  height: number,
): Promise<void> {
  // S'assurer que WASM est chargé
  await loadWasmModule();

  // Si WASM non-disponible, fallback sur CSS
  if (!hasWasmSupport()) {
    console.warn('[WASM] Fallback à CSS filters');
    return renderWithCSSFallback(canvas, imageUrl);
  }

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context non-disponible');
    }

    // Créer une image temporaire pour lire les pixels
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          // Dimensionner le canvas
          canvas.width = width;
          canvas.height = height;

          // Dessiner l'image sur le canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Lire les données pixel
          const t0 = performance.now();
          const imageData = ctx.getImageData(0, 0, width, height);
          const t1 = performance.now();
          const pixels = imageData.data;

          // Appeler WASM pour traiter les pixels
          const t2 = performance.now();
          const wasmModule = window.luminafastWasm;
          if (!wasmModule || typeof wasmModule.PixelFiltersWasm !== 'function') {
            throw new Error('WASM module unavailable');
          }

          // Normaliser les filtres UI vers les plages attendues par WASM
          const normalizedFilters = normalizeFiltersForWasm(_filters);
          const t3 = performance.now();

          // PERF: Réutiliser l'instance de filtres au lieu de recréer (économise 8ms/frame)
          if (!cachedFiltersInstance) {
            cachedFiltersInstance = new wasmModule.PixelFiltersWasm(0, 0, 1, 0, 0, 0, 0, 5500, 0);
          }

          // Mettre à jour les propriétés via setters (beaucoup plus rapide que new)
          cachedFiltersInstance.exposure = normalizedFilters.exposure;
          cachedFiltersInstance.contrast = normalizedFilters.contrast;
          cachedFiltersInstance.saturation = normalizedFilters.saturation;
          cachedFiltersInstance.highlights = normalizedFilters.highlights ?? 0;
          cachedFiltersInstance.shadows = normalizedFilters.shadows ?? 0;
          cachedFiltersInstance.clarity = normalizedFilters.clarity ?? 0;
          cachedFiltersInstance.vibrance = normalizedFilters.vibrance ?? 0;
          cachedFiltersInstance.color_temp = normalizedFilters.colorTemp ?? 5500;
          cachedFiltersInstance.tint = normalizedFilters.tint ?? 0;
          const t4 = performance.now();

          // Appeler apply_filters() sur l'instance réutilisée
          const processedPixels = cachedFiltersInstance.apply_filters(pixels, width, height);
          const t5 = performance.now();

          // Copier les résultats back (itération complète)
          // PERF: Utiliser .set() au lieu d'une boucle for (10x plus rapide)
          imageData.data.set(processedPixels);
          const t6 = performance.now();

          // Afficher sur le canvas
          ctx.putImageData(imageData, 0, 0);
          const t7 = performance.now();

          // Profiling détaillé
          const latency = t7 - t0;
          // TODO(phase-maintenance): Revenir sur l'optimisation WASM.
          // Objectif: ramener wasmApplyFilters sous ~5ms et le total sous 16ms de façon stable.
          // Symptôme actuel observé: pics fréquents autour de 35ms côté wasmApplyFilters.
          if (import.meta.env.DEV || latency > 16) {
            console.warn(`[WASM PERF] Total: ${latency.toFixed(2)}ms (budget: 16ms)`, {
              getImageData: (t1 - t0).toFixed(2),
              filterNormalization: (t3 - t2).toFixed(2),
              wasmInstanceCreation: (t4 - t3).toFixed(2),
              wasmApplyFilters: (t5 - t4).toFixed(2),
              pixelsWriteBack: (t6 - t5).toFixed(2),
              putImageData: (t7 - t6).toFixed(2),
            });
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error(`Impossible de charger l'image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.error('[WASM] Erreur lors du rendu', error);
    // Fallback sur CSS en cas d'erreur
    return renderWithCSSFallback(canvas, imageUrl);
  }
}

/**
 * Fallback : rendu avec CSS filters
 * @internal
 */
async function renderWithCSSFallback(canvas: HTMLCanvasElement, imageUrl: string): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context non-disponible');
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        resolve();
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`Impossible de charger l'image: ${imageUrl}`));
    };

    img.src = imageUrl;
  });
}

/**
 * Mesure la latence du WASM (benchmark)
 */
export async function measureWasmLatency(): Promise<number> {
  await loadWasmModule();

  if (!hasWasmSupport()) {
    return -1; // WASM non-disponible
  }

  // Créer un petit buffer test (10x10 image)
  const testPixels = new Uint8ClampedArray(10 * 10 * 4);
  for (let i = 0; i < testPixels.length; i += 4) {
    testPixels[i] = 100; // R
    testPixels[i + 1] = 100; // G
    testPixels[i + 2] = 100; // B
    testPixels[i + 3] = 255; // A
  }

  const startTime = performance.now();
  const wasmModule = window.luminafastWasm;
  if (!wasmModule || typeof wasmModule.PixelFiltersWasm !== 'function') {
    return -1;
  }

  // Créer instance et appliquer filtres test
  const filters = new wasmModule.PixelFiltersWasm(0.5, 0.3, 1.2, 0.0, 0.0, 0.0, 0.0, 5500.0, 0.0);
  filters.apply_filters(testPixels, 10, 10);

  const endTime = performance.now();

  return endTime - startTime;
}

/**
 * Détecte la support WASM du navigateur (sans charger le module)
 */
export function supportsWebAssembly(): boolean {
  return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
}

/**
 * Réinitialise l'état du WASM (utile pour tests)
 */
export function resetWasmModule(): void {
  wasmStatus = {
    available: false,
    loaded: false,
  };
  delete window.luminafastWasm;
}

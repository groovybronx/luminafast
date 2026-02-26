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
    apply_filters(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray;
  };
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
 * Charge le module WASM de manière asynchrone
 * @returns Promesse résolue si WASM chargé avec succès
 */
export async function loadWasmModule(): Promise<void> {
  // Si déjà chargé, ne rien faire
  if (wasmStatus.loaded) {
    return;
  }

  try {
    // Charger le module WASM depuis src/wasm/ (traité comme module ES par Vite)
    // Format: luminafast_wasm.js + luminafast_wasm_bg.wasm
    // Produits par: wasm-pack build --target web

    // Import dynamique du module ES généré par wasm-bindgen
    // @ts-expect-error — Module WASM généré au build-time, disponible au runtime dans src/wasm/
    const wasmModule = (await import('@/wasm/luminafast_wasm.js')) as WasmExports;

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
 * Rendu avec WASM (plus performant)
 * @param canvas - Canvas HTML pour rendu
 * @param imageUrl - URL de l'image source
 * @param filters - États des filtres pixel
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
          const imageData = ctx.getImageData(0, 0, width, height);
          const pixels = imageData.data;

          // Appeler WASM pour traiter les pixels
          const startTime = performance.now();
          const wasmModule = window.luminafastWasm;
          if (!wasmModule || typeof wasmModule.PixelFiltersWasm !== 'function') {
            throw new Error('WASM module unavailable');
          }

          // Créer instance PixelFiltersWasm avec tous les paramètres
          const filters = new wasmModule.PixelFiltersWasm(
            _filters.exposure,
            _filters.contrast,
            _filters.saturation,
            _filters.highlights ?? 0,
            _filters.shadows ?? 0,
            _filters.clarity ?? 0,
            _filters.vibrance ?? 0,
            _filters.colorTemp ?? 5500,
            _filters.tint ?? 0,
          );

          // Appeler apply_filters() sur l'instance
          const processedPixels = filters.apply_filters(
            new Uint8ClampedArray(pixels),
            width,
            height,
          );
          const latency = performance.now() - startTime;

          if (latency > 16) {
            console.warn(`[WASM] Latence élevée: ${latency.toFixed(2)}ms (budget: 16ms)`);
          }

          // Mettre à jour les données pixel
          for (let i = 0; i < processedPixels.length; i++) {
            imageData.data[i] = processedPixels[i] ?? 0;
          }

          // Afficher sur le canvas
          ctx.putImageData(imageData, 0, 0);

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

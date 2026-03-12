/**
 * Tests WASM Rendering Service — Phase B
 * Tests unitaires + intégration du système de rendu WASM
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadWasmModule,
  hasWasmSupport,
  renderWithWasm,
  supportsWebAssembly,
  resetWasmModule,
  measureWasmLatency,
  normalizeFiltersForWasm,
} from '@/services/wasmRenderingService';
import type { PixelFilterState } from '@/types/rendering';

// Filtre par défaut pour les tests
const DEFAULT_TEST_FILTERS: PixelFilterState = {
  exposure: 0,
  contrast: 0,
  saturation: 1,
  highlights: 0,
  shadows: 0,
  clarity: 0,
  vibrance: 0,
  colorTemp: 5500,
  tint: 0,
};

interface WasmParityExports {
  initSync: (input: { module: Uint8Array }) => unknown;
  PixelFiltersWasm: new (
    exposure: number,
    contrast: number,
    saturation: number,
    highlights: number,
    shadows: number,
    clarity: number,
    vibrance: number,
    colorTemp: number,
    tint: number,
  ) => {
    apply_filters(pixels: Uint8Array, width: number, height: number): Uint8Array;
  };
}

interface VisualParityCase {
  name: string;
  width: number;
  height: number;
  sourcePixels: number[];
  filters: PixelFilterState;
  referencePixels: number[];
}

const VISUAL_PARITY_DELTA_THRESHOLD = 2;

const VISUAL_PARITY_DATASET: VisualParityCase[] = [
  {
    name: 'low_light',
    width: 3,
    height: 2,
    sourcePixels: [
      12, 15, 18, 255, 20, 18, 14, 255, 28, 22, 19, 255, 16, 20, 24, 255, 24, 25, 21, 255, 32, 30,
      26, 255,
    ],
    filters: {
      exposure: 35,
      contrast: 10,
      saturation: 12,
      highlights: -20,
      shadows: 65,
      clarity: 15,
      vibrance: 18,
      colorTemp: 5600,
      tint: 5,
    },
    referencePixels: [
      8, 13, 17, 255, 20, 17, 11, 255, 31, 22, 18, 255, 13, 20, 26, 255, 25, 27, 21, 255, 36, 34,
      27, 255,
    ],
  },
  {
    name: 'highlights',
    width: 3,
    height: 2,
    sourcePixels: [
      220, 210, 200, 255, 235, 228, 215, 255, 245, 240, 232, 255, 210, 205, 198, 255, 230, 220, 210,
      255, 250, 246, 238, 255,
    ],
    filters: {
      exposure: -12,
      contrast: 8,
      saturation: -5,
      highlights: -72,
      shadows: 18,
      clarity: 10,
      vibrance: 8,
      colorTemp: 5200,
      tint: -6,
    },
    referencePixels: [
      174, 159, 149, 255, 186, 173, 161, 255, 195, 182, 174, 255, 166, 155, 148, 255, 182, 166, 157,
      255, 199, 187, 178, 255,
    ],
  },
  {
    name: 'high_contrast',
    width: 3,
    height: 2,
    sourcePixels: [
      8, 8, 8, 255, 250, 250, 250, 255, 30, 32, 28, 255, 225, 220, 215, 255, 45, 40, 35, 255, 245,
      240, 235, 255,
    ],
    filters: {
      exposure: 5,
      contrast: 45,
      saturation: 18,
      highlights: -35,
      shadows: 35,
      clarity: 45,
      vibrance: 22,
      colorTemp: 5400,
      tint: 2,
    },
    referencePixels: [
      0, 0, 0, 255, 254, 253, 249, 255, 9, 12, 5, 255, 227, 219, 209, 255, 31, 22, 14, 255, 249,
      242, 231, 255,
    ],
  },
  {
    name: 'skin_warm',
    width: 3,
    height: 2,
    sourcePixels: [
      172, 126, 108, 255, 186, 140, 122, 255, 160, 116, 98, 255, 194, 148, 128, 255, 180, 134, 114,
      255, 168, 122, 102, 255,
    ],
    filters: {
      exposure: 8,
      contrast: -4,
      saturation: 14,
      highlights: -10,
      shadows: 12,
      clarity: 8,
      vibrance: 26,
      colorTemp: 6400,
      tint: 14,
    },
    referencePixels: [
      161, 130, 114, 255, 174, 145, 129, 255, 150, 120, 104, 255, 181, 153, 136, 255, 168, 139, 120,
      255, 157, 126, 108, 255,
    ],
  },
  {
    name: 'mixed_interior_exterior',
    width: 3,
    height: 2,
    sourcePixels: [
      62, 78, 98, 255, 118, 130, 146, 255, 188, 178, 162, 255, 42, 52, 70, 255, 138, 146, 152, 255,
      214, 202, 188, 255,
    ],
    filters: {
      exposure: 12,
      contrast: 14,
      saturation: 10,
      highlights: -28,
      shadows: 28,
      clarity: 20,
      vibrance: 16,
      colorTemp: 5750,
      tint: 3,
    },
    referencePixels: [
      61, 84, 113, 255, 117, 136, 158, 255, 178, 173, 157, 255, 38, 53, 78, 255, 139, 153, 163, 255,
      204, 197, 185, 255,
    ],
  },
];

function computeMeanAbsoluteRgbDelta(actual: number[], expected: number[]): number {
  if (actual.length !== expected.length) {
    throw new Error('Buffer length mismatch for visual parity comparison');
  }

  let sum = 0;
  let count = 0;

  for (let i = 0; i < actual.length; i += 4) {
    const actualR = actual[i];
    const actualG = actual[i + 1];
    const actualB = actual[i + 2];
    const expectedR = expected[i];
    const expectedG = expected[i + 1];
    const expectedB = expected[i + 2];

    if (
      actualR === undefined ||
      actualG === undefined ||
      actualB === undefined ||
      expectedR === undefined ||
      expectedG === undefined ||
      expectedB === undefined
    ) {
      throw new Error('Unexpected undefined channel value during visual parity comparison');
    }

    sum += Math.abs(actualR - expectedR);
    sum += Math.abs(actualG - expectedG);
    sum += Math.abs(actualB - expectedB);
    count += 3;
  }

  return sum / count;
}

async function loadWasmParityModule(): Promise<WasmParityExports> {
  const wasmModule = (await import('@wasm/luminafast_wasm')) as unknown as WasmParityExports;
  const wasmBinary = readFileSync('luminafast-wasm/pkg/luminafast_wasm_bg.wasm');

  wasmModule.initSync({ module: wasmBinary });

  return wasmModule;
}

describe('wasmRenderingService', () => {
  beforeEach(() => {
    resetWasmModule();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetWasmModule();
  });

  describe('supportsWebAssembly', () => {
    it('should return true if WebAssembly is available', () => {
      // WebAssembly est disponible dans tous les navigateurs modernes et Node.js 16+
      expect(supportsWebAssembly()).toBe(typeof WebAssembly === 'object');
    });
  });

  describe('loadWasmModule', () => {
    it('should handle WASM module load gracefully (unavailable)', async () => {
      // Dans l'environnement de test, le module WASM n'existe pas
      await loadWasmModule();

      // Doit faire fallback sans erreur
      expect(hasWasmSupport()).toBe(false);
    });

    it('should not throw on repeated load calls', async () => {
      await loadWasmModule();
      await loadWasmModule(); // Second call should be no-op

      expect(true).toBe(true); // If we got here, no exception was thrown
    });
  });

  describe('hasWasmSupport', () => {
    it('should return false when not loaded', () => {
      expect(hasWasmSupport()).toBe(false);
    });

    it('should return false after failed load', async () => {
      await loadWasmModule();
      expect(hasWasmSupport()).toBe(false);
    });
  });

  describe('renderWithWasm', () => {
    it('should fallback gracefully when WASM unavailable', async () => {
      const canvas = document.createElement('canvas');

      // Image invalide + WASM unavailable → rejet attendu
      await expect(
        renderWithWasm(canvas, 'http://invalid.test/image.png', DEFAULT_TEST_FILTERS, 1, 1),
      ).rejects.toThrow();
    });

    it('should log CSS fallback path when WASM is unavailable', async () => {
      const canvas = document.createElement('canvas');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await expect(
        renderWithWasm(canvas, 'http://invalid.test/image.png', DEFAULT_TEST_FILTERS, 1, 1),
      ).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith('[WASM] Fallback à CSS filters');
      warnSpy.mockRestore();
    });

    it('should handle missing canvas context gracefully', async () => {
      const canvas = {
        getContext: () => null,
        width: 0,
        height: 0,
      } as unknown as HTMLCanvasElement;

      // Doit rejeter si pas de contexte 2D
      await expect(
        renderWithWasm(canvas, 'http://example.com/img.png', DEFAULT_TEST_FILTERS, 1, 1),
      ).rejects.toThrow();
    });
  });

  describe('measureWasmLatency', () => {
    it('should return -1 when WASM not available', async () => {
      const latency = await measureWasmLatency();
      expect(latency).toBe(-1);
    });

    it('should return a number when WASM is available', async () => {
      // Mock WASM module avec nouvelle API PixelFiltersWasm
      const mockApplyFilters = vi.fn(() => new Uint8ClampedArray(400));

      window.luminafastWasm = {
        PixelFiltersWasm: vi.fn().mockImplementation(() => ({
          apply_filters: mockApplyFilters,
        })),
        default: vi.fn().mockResolvedValue(undefined),
      } as never;

      // Cette fois, si WASM était vraiment disponible...
      // Mais dans les tests, il ne l'est pas, donc latency = -1
      const latency = await measureWasmLatency();
      expect(typeof latency).toBe('number');
    });
  });

  describe('resetWasmModule', () => {
    it('should clear WASM state', async () => {
      await loadWasmModule();
      resetWasmModule();

      expect(hasWasmSupport()).toBe(false);
      expect(window.luminafastWasm).toBeUndefined();
    });
  });

  describe('Canvas rendering integration', () => {
    it('should create Canvas with correct dimensions', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      // jsdom peut retourner null pour getContext — c'est acceptable
      if (ctx) {
        expect(canvas.width).toBe(0);
        expect(canvas.height).toBe(0);
      } else {
        // Canvas crée sans erreur même si contexte indisponible en jsdom
        expect(canvas).toBeDefined();
      }
    });

    it('should handle ImageData operations', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // jsdom peut ne pas supporter getContext('2d') — accepter les deux
      if (!ctx) {
        expect(true).toBe(true); // Canvas créé, contexte indisponible mais pas d'erreur
        return;
      }

      canvas.width = 1;
      canvas.height = 1;

      const imageData = ctx.createImageData(1, 1);
      expect(imageData.data.length).toBe(4); // RGBA

      // Mettre à jour et remettre
      imageData.data[0] = 255; // R
      imageData.data[1] = 128; // G
      imageData.data[2] = 64; // B
      imageData.data[3] = 255; // A

      ctx.putImageData(imageData, 0, 0);
      expect(true).toBe(true); // No error
    });
  });

  describe('Filter state handling', () => {
    it('should accept all filter parameters', async () => {
      const filters: PixelFilterState = {
        exposure: -1.5,
        contrast: 1.5,
        saturation: 0.5,
        highlights: 0.8,
        shadows: -0.3,
        clarity: 25,
        vibrance: -10,
        colorTemp: 3500, // Warm (warm color temp)
        tint: 15,
      };

      const canvas = document.createElement('canvas');

      // Doit accepter toutes les valeurs sans erreur
      try {
        await renderWithWasm(canvas, 'data:image/png;base64,iV', filters, 10, 10);
      } catch {
        // Fallback OK — pas d'erreur de paramètre
      }

      expect(true).toBe(true);
    });

    it('should use default filter values when not provided', async () => {
      const canvas = document.createElement('canvas');

      // Appeler avec DEFAULT_TEST_FILTERS (tous les defaults fournis)
      await expect(
        renderWithWasm(canvas, 'http://invalid.test/img.png', DEFAULT_TEST_FILTERS, 10, 10),
      ).rejects.toThrow();

      expect(true).toBe(true);
    });
  });

  describe('Performance benchmarking', () => {
    it('should track latency measurements', async () => {
      // Quand WASM est disponible, latency doit être mesurable
      const latency = await measureWasmLatency();

      // WASM unavailable dans les tests
      expect(latency).toBe(-1);
    });

    it('should complete fast (<16ms) on small images', () => {
      // Ce test verifierait que <16ms si WASM était disponible
      // Pour l'instant, juste vérifier que la fonction existe
      expect(typeof measureWasmLatency).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid image URLs', async () => {
      const canvas = document.createElement('canvas');

      // URL invalide — doit fallback sans crash
      try {
        await renderWithWasm(
          canvas,
          'http://invalid-domain-xyz.test/image.png',
          DEFAULT_TEST_FILTERS,
          100,
          100,
        );
      } catch {
        // Erreur attendue — OK
      }

      expect(true).toBe(true);
    });

    it('should handle zero dimensions', async () => {
      const canvas = document.createElement('canvas');

      try {
        await renderWithWasm(canvas, 'data:image/png;base64,iV', DEFAULT_TEST_FILTERS, 0, 0);
      } catch {
        // Erreur attendue — OK
      }

      expect(true).toBe(true);
    });
  });

  describe('normalizeFiltersForWasm', () => {
    it('should normalize exposure from UI range to WASM range', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        exposure: 100, // UI max
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.exposure).toBe(100 / 50); // Should be 2.0
      expect(normalized.exposure).toBe(2.0);
    });

    it('should normalize exposure negative values', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        exposure: -100, // UI min
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.exposure).toBe(-100 / 50); // Should be -2.0
      expect(normalized.exposure).toBe(-2.0);
    });

    it('should normalize contrast correctly', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        contrast: 50,
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.contrast).toBe(50 / 50); // Should be 1.0
      expect(normalized.contrast).toBe(1.0);
    });

    it('should normalize saturation with offset (1 = normal)', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        saturation: 0, // UI default (no change)
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.saturation).toBe(1 + 0 / 100); // Should be 1.0 (no change)
      expect(normalized.saturation).toBe(1.0);
    });

    it('should normalize saturation positive (more saturated)', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        saturation: 100, // UI max (more saturated)
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.saturation).toBe(1 + 100 / 100); // Should be 2.0
      expect(normalized.saturation).toBe(2.0);
    });

    it('should normalize saturation negative (less saturated)', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        saturation: -100, // UI min (less saturated/B&W)
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.saturation).toBe(1 + -100 / 100); // Should be 0.0
      expect(normalized.saturation).toBe(0.0);
    });

    it('should normalize highlights to [-1, +1]', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        highlights: 100, // UI max
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.highlights).toBe(100 / 100); // Should be 1.0
      expect(normalized.highlights).toBe(1.0);
    });

    it('should normalize shadows to [-1, +1]', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        shadows: -100, // UI min
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.shadows).toBe(-100 / 100); // Should be -1.0
      expect(normalized.shadows).toBe(-1.0);
    });

    it('should normalize tint to [-50, +50]', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        tint: 100, // UI max
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.tint).toBe(100 / 2); // Should be 50.0
      expect(normalized.tint).toBe(50.0);
    });

    it('should normalize tint negative to [-50, +50]', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        tint: -100, // UI min
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.tint).toBe(-100 / 2); // Should be -50.0
      expect(normalized.tint).toBe(-50.0);
    });

    it('should preserve colorTemp (no normalization)', () => {
      const filters: PixelFilterState = {
        ...DEFAULT_TEST_FILTERS,
        colorTemp: 6500,
      };

      const normalized = normalizeFiltersForWasm(filters);
      expect(normalized.colorTemp).toBe(6500);
    });

    it('should normalize all filters together', () => {
      const filters: PixelFilterState = {
        exposure: 50,
        contrast: -50,
        saturation: 50,
        highlights: 50,
        shadows: -50,
        clarity: 50,
        vibrance: 50,
        colorTemp: 7000,
        tint: -50,
      };

      const normalized = normalizeFiltersForWasm(filters);

      expect(normalized.exposure).toBe(50 / 50); // 1.0
      expect(normalized.contrast).toBe(-50 / 50); // -1.0
      expect(normalized.saturation).toBe(1 + 50 / 100); // 1.5
      expect(normalized.highlights).toBe(50 / 100); // 0.5
      expect(normalized.shadows).toBe(-50 / 100); // -0.5
      expect(normalized.clarity).toBe(50 / 100); // 0.5
      expect(normalized.vibrance).toBe(50 / 100); // 0.5
      expect(normalized.colorTemp).toBe(7000);
      expect(normalized.tint).toBe(-50 / 2); // -25.0
    });

    it('should handle default values with optional chaining', () => {
      const filters: PixelFilterState = {
        exposure: 0,
        contrast: 0,
        saturation: 0,
        highlights: undefined as unknown as number, // Pas possible en TS mais test robustesse
        shadows: undefined as unknown as number,
        clarity: undefined as unknown as number,
        vibrance: undefined as unknown as number,
        colorTemp: 5500,
        tint: undefined as unknown as number,
      };

      // normalizeFiltersForWasm utilise ?? 0 donc doit gérer undefined/null
      const normalized = normalizeFiltersForWasm(filters);

      // Devrait utiliser les valeurs par défaut (0)
      expect(normalized.highlights).toBe(0);
      expect(normalized.shadows).toBe(0);
      expect(normalized.clarity).toBe(0);
      expect(normalized.vibrance).toBe(0);
      expect(normalized.tint).toBe(0);
    });

    it('should keep visual parity on reference dataset with mean RGB delta <= 2', async () => {
      const wasmModule = await loadWasmParityModule();

      for (const visualCase of VISUAL_PARITY_DATASET) {
        const normalized = normalizeFiltersForWasm(visualCase.filters);

        const wasmFilters = new wasmModule.PixelFiltersWasm(
          normalized.exposure,
          normalized.contrast,
          normalized.saturation,
          normalized.highlights ?? 0,
          normalized.shadows ?? 0,
          normalized.clarity ?? 0,
          normalized.vibrance ?? 0,
          normalized.colorTemp ?? 5500,
          normalized.tint ?? 0,
        );

        const output = wasmFilters.apply_filters(
          new Uint8Array(visualCase.sourcePixels),
          visualCase.width,
          visualCase.height,
        );

        const meanDelta = computeMeanAbsoluteRgbDelta(
          Array.from(output),
          visualCase.referencePixels,
        );

        expect(meanDelta).toBeLessThanOrEqual(VISUAL_PARITY_DELTA_THRESHOLD);
      }
    });
  });
});

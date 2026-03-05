import { useEffect, useRef, useState } from 'react';
import { loadWasmModule, hasWasmSupport } from '@/services/wasmRenderingService';

const NUM_BINS = 64; // Réduction de 256 → 64 bins pour l'affichage

/** Réduit 256 bins WASM en NUM_BINS par somme de groupes */
function downsample(channel: Uint32Array, bins: number): number[] {
  const groupSize = 256 / bins;
  const out: number[] = [];
  for (let b = 0; b < bins; b++) {
    let sum = 0;
    for (let k = 0; k < groupSize; k++) {
      sum += channel[Math.floor(b * groupSize + k)] ?? 0;
    }
    out.push(sum);
  }
  return out;
}

interface HistogramProps {
  previewUrl?: string;
  exifSummary?: string;
}

/**
 * Histogramme RGB calculé via WASM compute_histogram.
 * Affiche les 3 canaux R/G/B superposés en barres verticales.
 * Fallback sur un état vide si WASM non-disponible ou image absente.
 */
export const Histogram = ({ previewUrl, exifSummary }: HistogramProps) => {
  const [channels, setChannels] = useState<{ r: number[]; g: number[]; b: number[] } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const compute = async () => {
      if (!previewUrl) {
        setChannels(null);
        return;
      }

      // Charger WASM si besoin
      await loadWasmModule();
      if (!hasWasmSupport() || controller.signal.aborted) return;

      // Décoder l'image via un canvas hors-écran
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = previewUrl;
      });

      if (controller.signal.aborted) return;

      // Redimensionner à 128×128 pour réduire la charge de calcul
      const size = 128;
      const offscreen = new OffscreenCanvas(size, size);
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      const wasmModule = window.luminafastWasm;
      if (!wasmModule || controller.signal.aborted) return;

      const histogram = wasmModule.compute_histogram(data as unknown as Uint8Array, size, size);

      // Extraire les 3 canaux Uint32Array (256 valeurs chacun)
      const rRaw = histogram.slice(0, 256);
      const gRaw = histogram.slice(256, 512);
      const bRaw = histogram.slice(512, 768);

      if (!controller.signal.aborted) {
        setChannels({
          r: downsample(rRaw, NUM_BINS),
          g: downsample(gRaw, NUM_BINS),
          b: downsample(bRaw, NUM_BINS),
        });
      }
    };

    compute().catch(() => {
      /* Silencieux — WASM non-disponible ou image invalide */
    });

    return () => controller.abort();
  }, [previewUrl]);

  // Normaliser chaque canal par rapport au max global
  const maxVal = channels ? Math.max(...channels.r, ...channels.g, ...channels.b, 1) : 1;

  return (
    <div className="h-24 bg-zinc-900 rounded border border-zinc-800 relative overflow-hidden">
      {channels ? (
        <div className="absolute inset-0 flex items-end px-1 gap-px">
          {Array.from({ length: NUM_BINS }).map((_, i) => {
            const rH = ((channels.r[i] ?? 0) / maxVal) * 100;
            const gH = ((channels.g[i] ?? 0) / maxVal) * 100;
            const bH = ((channels.b[i] ?? 0) / maxVal) * 100;
            return (
              <div key={i} className="flex-1 relative" style={{ height: '100%' }}>
                <div
                  className="absolute bottom-0 w-full bg-red-500 opacity-50"
                  style={{ height: `${rH}%` }}
                />
                <div
                  className="absolute bottom-0 w-full bg-green-500 opacity-50"
                  style={{ height: `${gH}%` }}
                />
                <div
                  className="absolute bottom-0 w-full bg-blue-500 opacity-50"
                  style={{ height: `${bH}%` }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-end px-1 gap-px">
          {Array.from({ length: NUM_BINS }).map((_, i) => (
            <div key={i} className="flex-1 bg-zinc-700 opacity-20" style={{ height: '8%' }} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-zinc-900/20 to-transparent pointer-events-none" />
      {exifSummary && (
        <div className="absolute top-1 left-1 text-[9px] text-zinc-500 font-mono">
          {exifSummary}
        </div>
      )}
    </div>
  );
};

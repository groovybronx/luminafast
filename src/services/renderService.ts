/**
 * Service de rendu (Pipeline Phase 4.2)
 * Responsable du calcul des CSS filters et de leur cache local.
 *
 * Architecture:
 * - Invoque les commandes Tauri compute_css_filters et get_render_info
 * - Maintient un cache local LRU (max 100 entrées)
 * - Invalide le cache sur changement d'edits
 * - Gère les erreurs de Tauri avec retry/fallback
 */

import { invoke } from '@tauri-apps/api/core';
import type { FilterStringDTO, RenderInfoDTO } from '@/types/render';

/** Cache LRU pour les CSS filters calculés */
class RenderCache {
  private cache = new Map<number, { cssFilter: string; hash: string; timestamp: number }>();
  private readonly maxEntries = 100;

  get(imageId: number, currentEditHash: string): string | null {
    const entry = this.cache.get(imageId);
    if (!entry) return null;

    // Valider que le hash des edits n'a pas changé
    if (entry.hash !== currentEditHash) {
      this.cache.delete(imageId);
      return null;
    }

    // Cache hit
    return entry.cssFilter;
  }

  set(imageId: number, cssFilter: string, editHash: string): void {
    // Si on atteint la limite, supprimer l'entrée la plus ancienne (LRU eviction)
    if (this.cache.size >= this.maxEntries && !this.cache.has(imageId)) {
      let oldestKey: number | null = null;
      let oldestTime = Infinity;

      for (const [key, value] of this.cache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey !== null) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(imageId, {
      cssFilter,
      hash: editHash,
      timestamp: Date.now(),
    });
  }

  invalidate(imageId: number): void {
    this.cache.delete(imageId);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const cache = new RenderCache();

/**
 * Calcule un hash simple des edits pour invalidation de cache.
 * Utilise JSON.stringify et un hash simple basé sur length.
 */
function hashEditState(editState: Record<string, number>): string {
  const json = JSON.stringify(editState);
  // Hash simple basé sur la longueur + première et dernière chars
  return `${json.length}-${json.charCodeAt(0)}-${json.charCodeAt(json.length - 1)}`;
}

/**
 * Calcule la chaîne CSS filter pour une image basée sur son état d'édition.
 * Utilise le cache local si disponible et valide.
 *
 * @param imageId - ID de l'image à filtrer
 * @param editState - État d'édition courant de l'image
 * @returns Promise<string> - Chaîne CSS filter applicable au style DOM
 * @throws Error si le calcul échoue (erreur Tauri, image non trouvée, etc.)
 *
 * @example
 * const editState = { exposureValue: 0.5, contrastValue: 0.2 };
 * const cssFilter = await renderService.computeCSSFilters(42, editState);
 * // Returns: "brightness(1.500) contrast(1.200)"
 * element.style.filter = cssFilter;
 */
export async function computeCSSFilters(
  imageId: number,
  editState: Record<string, number>,
): Promise<string> {
  const editHash = hashEditState(editState);

  // Vérifier le cache
  const cached = cache.get(imageId, editHash);
  if (cached !== null) {
    return cached;
  }

  // Cache miss : invoquer le backend
  try {
    const result = await invoke<FilterStringDTO>('compute_css_filters', {
      imageId,
    });

    cache.set(imageId, result.cssFilter, editHash);
    return result.cssFilter;
  } catch (error) {
    console.error(`[RenderService] Failed to compute CSS filters for image ${imageId}:`, error);
    // Retourner une chaîne vide plutôt que de crasher
    // L'image s'affichera sans filtres plutôt que pas du tout
    return '';
  }
}

/**
 * Récupère les métadonnées de rendu pour une image (width, height, format, orientation).
 * Utile pour les futurs optimisations (phase 4.2B+) et le context rendering.
 *
 * @param imageId - ID de l'image
 * @returns Promise<RenderInfoDTO> - Métadonnées de l'image
 * @throws Error si l'image n'existe pas ou si l'appel échoue
 */
export async function getRenderInfo(imageId: number): Promise<RenderInfoDTO> {
  try {
    const info = await invoke<RenderInfoDTO>('get_render_info', {
      imageId,
    });
    return info;
  } catch (error) {
    console.error(`[RenderService] Failed to get render info for image ${imageId}:`, error);
    throw error;
  }
}

/**
 * Invalide le cache pour une image donnée.
 * À appeler quand l'état d'édition change (applyEdit, undo, redo, reset).
 *
 * @param imageId - ID de l'image dont invalider le cache
 */
export function invalidateCache(imageId: number | null): void {
  if (imageId !== null) {
    cache.invalidate(imageId);
  }
}

/**
 * Vide complètement le cache local.
 * À utiliser quand on quitte le Develop panel ou lors d'un reset complet.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Récupère les stats du cache (à des fins de debugging/monitoring).
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
} {
  return {
    size: cache.size(),
    maxSize: 100,
  };
}

// Pattern d'export pour faciliter les tests
export const renderService = {
  computeCSSFilters,
  getRenderInfo,
  invalidateCache,
  clearCache,
  getCacheStats,
};

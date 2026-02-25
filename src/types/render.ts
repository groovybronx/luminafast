/**
 * Types pour le pipeline de rendu d'images (Phase 4.2)
 */

/** DTO contenant la chaîne CSS filter calculée pour una image */
export interface FilterStringDTO {
  cssFilter: string;
  computedAt: string;
}

/** DTO contenant les métadonnées de rendu d'une image */
export interface RenderInfoDTO {
  width: number;
  height: number;
  format: string;
  orientation: number;
}

/** Structure interne du cache de rendu */
export interface RenderCacheEntry {
  imageId: number;
  cssFilter: string;
  editStateHash: string; // Hash des edits pour invalidation
  cachedAt: number;
}

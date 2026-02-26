/**
 * Service de rendu — Phase A (CSS Filters)
 * Conversion des événements Event Sourcing → filtres CSS appliqués
 * Phase 4.2 — Pipeline de Rendu Image
 */

import type { EventDTO } from './eventService';
import type { CSSFilterState, PixelFilterState } from '@/types/rendering';
import { DEFAULT_EDIT_STATE } from '@/types/image';

/**
 * Convertit les événements EDIT en état de filtres CSS
 * Les autres types d'événements (RATING, FLAG, etc.) sont ignorés
 *
 * @param events - Liste d'événements triées par timestamp
 * @returns État de filtres CSS calculé à partir des événements
 */
export function eventsToCSSFilters(events: EventDTO[]): CSSFilterState {
  // Initialiser avec les valeurs par défaut
  // Note: CSS saturation defaults to 1 (no change), not 0
  const filters: CSSFilterState = {
    exposure: 0,
    contrast: 0,
    saturation: 1, // CSS default: 1 = no change
  };

  // Appliquer les événements EDIT dans l'ordre (replay)
  for (const event of events) {
    // Vérifier que l'event est bien de type EDIT
    if (event.eventType !== 'ImageEdited') {
      continue;
    }

    const payload = event.payload as Partial<Record<string, unknown>>;
    if (!payload) {
      continue;
    }

    // Extraire les édits (payload contient un objet avec les changed fields)
    if (typeof payload.edits === 'object' && payload.edits !== null) {
      const edits = payload.edits as Partial<Record<string, unknown>>;

      // Mettre à jour les champs de filtres CSS
      if (typeof edits.exposure === 'number') {
        filters.exposure = edits.exposure;
      }
      if (typeof edits.contrast === 'number') {
        filters.contrast = edits.contrast;
      }
      // Handle saturation: CSS default is 1, EditState default is 0 (means no edit)
      // If editState.saturation is 0, keep CSS saturation at 1
      // If editState.saturation is > 0, use it as CSS saturation value
      if (typeof edits.saturation === 'number' && edits.saturation !== 0) {
        filters.saturation = edits.saturation;
      }
    }
  }

  return filters;
}

/**
 * Convertit les événements EDIT en état de filtres pixel (Phase B)
 * Inclut tous les filtres CSS + filtres avancés
 *
 * @param events - Liste d'événements triées par timestamp
 * @returns État de filtres pixel avec tous les paramètres
 */
export function eventsToPixelFilters(events: EventDTO[]): PixelFilterState {
  // Commencer par les filtres CSS
  const cssFilters = eventsToCSSFilters(events);

  // Initialiser les filtres pixel avec les defaults
  const filters: PixelFilterState = {
    ...cssFilters,
    highlights: DEFAULT_EDIT_STATE.highlights,
    shadows: DEFAULT_EDIT_STATE.shadows,
    clarity: DEFAULT_EDIT_STATE.clarity,
    vibrance: DEFAULT_EDIT_STATE.vibrance,
    colorTemp: DEFAULT_EDIT_STATE.temp,
    tint: DEFAULT_EDIT_STATE.tint,
  };

  // Appliquer les événements EDIT pour les filtres avancés
  for (const event of events) {
    if (event.eventType !== 'ImageEdited') {
      continue;
    }

    const payload = event.payload as Partial<Record<string, unknown>>;
    if (!payload || typeof payload.edits !== 'object' || payload.edits === null) {
      continue;
    }

    const edits = payload.edits as Partial<Record<string, unknown>>;

    // Mettre à jour tous les filtres
    if (typeof edits.highlights === 'number') {
      filters.highlights = edits.highlights;
    }
    if (typeof edits.shadows === 'number') {
      filters.shadows = edits.shadows;
    }
    if (typeof edits.clarity === 'number') {
      filters.clarity = edits.clarity;
    }
    if (typeof edits.vibrance === 'number') {
      filters.vibrance = edits.vibrance;
    }
    if (typeof edits.temp === 'number') {
      filters.colorTemp = edits.temp;
    }
    if (typeof edits.tint === 'number') {
      filters.tint = edits.tint;
    }
  }

  return filters;
}

/**
 * Convertit les filtres CSS en expression CSS filter standard
 * Optimisé pour performance (<1ms)
 *
 * @param filters - État des filtres CSS
 * @returns Expression CSS filter válida
 *
 * @example
 * const filters: CSSFilterState = { exposure: 0.5, contrast: 0.2, saturation: 1.0 };
 * const css = filtersToCSS(filters);
 * // Result: "brightness(1.15) contrast(1.1) saturate(1)"
 */
export function filtersToCSS(filters: CSSFilterState): string {
  const parts: string[] = [];

  // Exposure → brightness
  // Mapping: exposure in [-2, +2] → brightness in [0.3, ~1.7]
  // Formula: brightness = max(0.3, min(1.7, 1 + exposure * 0.3))
  const brightness = Math.max(0.3, Math.min(1.7, 1 + filters.exposure * 0.3));
  if (Math.abs(brightness - 1) > 0.01) {
    parts.push(`brightness(${brightness.toFixed(2)})`);
  }

  // Contrast → contrast (1 = normal)
  // Mapping: contrast in [-1, 3] → CSS contrast in [0.5, 3.0]
  const contrast = Math.max(0.5, 1 + filters.contrast * 0.5);
  if (Math.abs(contrast - 1) > 0.01) {
    parts.push(`contrast(${contrast.toFixed(2)})`);
  }

  // Saturation → saturate (1 = normal)
  // Mapping: saturation directly maps to CSS saturate value
  // Special case: saturation value of 0 means fully desaturated
  if (Math.abs(filters.saturation - 1) > 0.01) {
    parts.push(`saturate(${Math.max(0, filters.saturation).toFixed(2)})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Applique les filtres CSS à un élément HTML <img>
 * Utilise l'API style standard du DOM
 *
 * @param imageElement - Élément <img> cible
 * @param filters - État des filtres CSS
 */
export function applyCSSFilters(
  imageElement: HTMLImageElement | null,
  filters: CSSFilterState,
): void {
  if (!imageElement) {
    return;
  }

  const filterCSS = filtersToCSS(filters);
  imageElement.style.filter = filterCSS;
}

/**
 * Mesure la latence de rendu CSS
 * Utilisé pour les benchmarks et diagnostique
 *
 * @returns Latence en millisecondes
 */
export function calculateFilterLatency(): number {
  const startTime = performance.now();

  // Simuler l'application d'un filtre complexe
  const testFilters: CSSFilterState = {
    exposure: 0.5,
    contrast: 0.3,
    saturation: 1.2,
  };

  // Appeler la fonction pour mesurer sa latence
  filtersToCSS(testFilters);

  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Efface tous les filtres CSS (reset à l'état initial)
 *
 * @param imageElement - Élément <img> cible
 */
export function clearCSSFilters(imageElement: HTMLImageElement | null): void {
  if (imageElement) {
    imageElement.style.filter = 'none';
  }
}

/**
 * filterUtils.ts — Utilitaires de conversion et détection pour filtres
 * Centralise la logique partagée entre les composants de comparaison
 */

import type { EditState } from '@/types';
import type { PixelFilterState } from '@/types/rendering';

/**
 * Convertit un EditState en PixelFilterState
 * Gère les valeurs par défaut et le mapping des champs (temp → colorTemp)
 *
 * @param editState - État des éditions (peut être undefined)
 * @returns PixelFilterState avec les valeurs appropriées
 */
export function editStateToPixelFilters(editState: EditState | undefined): PixelFilterState {
  return {
    exposure: editState?.exposure ?? 0,
    contrast: editState?.contrast ?? 0,
    saturation: editState?.saturation ?? 0,
    highlights: editState?.highlights ?? 0,
    shadows: editState?.shadows ?? 0,
    clarity: editState?.clarity ?? 0,
    vibrance: editState?.vibrance ?? 0,
    colorTemp: editState?.temp ?? 0, // Mappage: 'temp' (EditState) → 'colorTemp' (PixelFilterState)
    tint: editState?.tint ?? 0,
  };
}

/**
 * Détecte si des filtres non-neutres sont appliqués
 * Compare les valeurs actuelles aux valeurs neutres/par défaut
 *
 * @param filters - État des filtres à vérifier
 * @returns true si au moins un filtre a une modification non-neutre
 */
export function hasNonNeutralFilters(filters: PixelFilterState): boolean {
  return (
    filters.exposure !== 0 ||
    filters.contrast !== 0 ||
    filters.saturation !== 0 ||
    filters.highlights !== 0 ||
    filters.shadows !== 0 ||
    filters.clarity !== 0 ||
    filters.vibrance !== 0 ||
    filters.tint !== 0 ||
    filters.colorTemp !== 0 // Valeur neutre pour la temp de couleur (K)
  );
}

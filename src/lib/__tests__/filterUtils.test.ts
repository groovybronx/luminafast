/**
 * filterUtils.test.ts — Tests unitaires des utilitaires de filtres
 */

import { describe, it, expect } from 'vitest';
import { editStateToPixelFilters, hasNonNeutralFilters } from '@/lib/filterUtils';
import type { EditState } from '@/types';

describe('filterUtils', () => {
  describe('editStateToPixelFilters', () => {
    it('convertit un EditState complet en PixelFilterState', () => {
      const editState: EditState = {
        exposure: 50,
        contrast: -30,
        saturation: 25,
        highlights: 10,
        shadows: -20,
        clarity: 15,
        vibrance: 5,
        temp: 6500, // Note: 'temp' dans EditState → 'colorTemp' dans PixelFilterState
        tint: -10,
      };

      const result = editStateToPixelFilters(editState);

      expect(result).toEqual({
        exposure: 50,
        contrast: -30,
        saturation: 25,
        highlights: 10,
        shadows: -20,
        clarity: 15,
        vibrance: 5,
        colorTemp: 6500,
        tint: -10,
      });
    });

    it('utilise les valeurs par défaut quand EditState est undefined', () => {
      const result = editStateToPixelFilters(undefined);

      expect(result).toEqual({
        exposure: 0,
        contrast: 0,
        saturation: 0,
        highlights: 0,
        shadows: 0,
        clarity: 0,
        vibrance: 0,
        colorTemp: 5500,
        tint: 0,
      });
    });

    it('remplace undefined par des valeurs par défaut quand des champs manquent', () => {
      const partialEditState: Partial<EditState> = {
        exposure: 20,
        saturation: 30,
        // Autres champs omis
      };

      const result = editStateToPixelFilters(partialEditState as EditState);

      expect(result.exposure).toBe(20);
      expect(result.saturation).toBe(30);
      expect(result.contrast).toBe(0);
      expect(result.highlights).toBe(0);
      expect(result.shadows).toBe(0);
      expect(result.clarity).toBe(0);
      expect(result.vibrance).toBe(0);
      expect(result.colorTemp).toBe(5500); // Valeur par défaut
      expect(result.tint).toBe(0);
    });

    it('mappe correctement temp → colorTemp', () => {
      const editState: EditState = {
        temp: 7200,
      } as EditState;

      const result = editStateToPixelFilters(editState);

      expect(result.colorTemp).toBe(7200);
    });

    it('accepte une temp de couleur neutre (5500K)', () => {
      const editState: EditState = {
        temp: 5500,
      } as EditState;

      const result = editStateToPixelFilters(editState);

      expect(result.colorTemp).toBe(5500);
    });
  });

  describe('hasNonNeutralFilters', () => {
    it('retourne false pour des filtres entièrement neutres', () => {
      const neutralFilters = editStateToPixelFilters(undefined);
      expect(hasNonNeutralFilters(neutralFilters)).toBe(false);
    });

    it('retourne true si exposure est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.exposure = 0.5;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si contrast est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.contrast = 0.2;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si saturation est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.saturation = 0.5;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si highlights est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.highlights = 0.3;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si shadows est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.shadows = -0.2;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si clarity est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.clarity = 0.1;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si vibrance est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.vibrance = 0.2;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si tint est modifié', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.tint = -5;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si colorTemp dévie de 5500K', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.colorTemp = 6500;
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne true si plusieurs filtres sont modifiés', () => {
      const editState: EditState = {
        exposure: 25,
        saturation: 15,
        temp: 6000,
      } as EditState;

      const filters = editStateToPixelFilters(editState);
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });

    it('retourne false si seules des valeurs 0 et 5500 sont présentes', () => {
      const filters = {
        exposure: 0,
        contrast: 0,
        saturation: 0,
        highlights: 0,
        shadows: 0,
        clarity: 0,
        vibrance: 0,
        colorTemp: 5500,
        tint: 0,
      };

      expect(hasNonNeutralFilters(filters)).toBe(false);
    });

    it('détecte même des modifications très petites (< 0.1)', () => {
      const filters = editStateToPixelFilters(undefined);
      filters.exposure = 0.01; // Très petit delta
      expect(hasNonNeutralFilters(filters)).toBe(true);
    });
  });
});

/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from '../searchParser';

describe('parseSearchQuery', () => {
  it('parse une requête simple avec un filtre', () => {
    expect(parseSearchQuery('iso:3200')).toEqual({
      text: '',
      filters: [{ field: 'iso', operator: ':', value: 3200 }],
    });
  });

  it('parse plusieurs filtres et texte libre', () => {
    expect(parseSearchQuery('star:4 camera:gfx vacances')).toEqual({
      text: 'vacances',
      filters: [
        { field: 'star', operator: ':', value: 4 },
        { field: 'camera', operator: ':', value: 'gfx' },
      ],
    });
  });

  it('gère les opérateurs numériques', () => {
    expect(parseSearchQuery('iso:>3200 star:>=3')).toEqual({
      text: '',
      filters: [
        { field: 'iso', operator: '>', value: 3200 },
        { field: 'star', operator: '>=', value: 3 },
      ],
    });
  });

  it('ignore les espaces superflus', () => {
    expect(parseSearchQuery('  iso : 1600   star : 4  ')).toEqual({
      text: '',
      filters: [
        { field: 'iso', operator: ':', value: 1600 },
        { field: 'star', operator: ':', value: 4 },
      ],
    });
  });

  it('retourne tout en texte libre si aucun filtre', () => {
    expect(parseSearchQuery('vacances été 2025')).toEqual({
      text: 'vacances été 2025',
      filters: [],
    });
  });

  it('gère les valeurs non numériques', () => {
    expect(parseSearchQuery('camera:gfx lens:35mm')).toEqual({
      text: '',
      filters: [
        { field: 'camera', operator: ':', value: 'gfx' },
        { field: 'lens', operator: ':', value: '35mm' },
      ],
    });
  });
});

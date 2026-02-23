/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performSearch } from '../searchService';
import type { SearchQuery } from '@/types/search';

// Mock de l'appel Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('performSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle la commande Tauri search_images avec la requête', async () => {
    const mockQuery: SearchQuery = {
      text: '',
      filters: [{ field: 'iso', operator: '>', value: 3200 }],
    };
    const mockResponse = { results: [], total: 0 };
    vi.mocked(invoke).mockResolvedValueOnce(mockResponse);

    const result = await performSearch(mockQuery);

    expect(invoke).toHaveBeenCalledWith('search_images', { query: mockQuery });
    expect(result).toEqual(mockResponse);
  });

  it('retourne un résultat vide en cas d\'erreur', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('Connexion failed'));

    const result = await performSearch({ text: 'test', filters: [] });

    expect(result).toEqual({ results: [], total: 0 });
  });
});

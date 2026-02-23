import { invoke } from '@tauri-apps/api/core';
import type { SearchQuery, SearchResponse } from '@/types/search';

/**
 * Service d'appel Tauri pour les requêtes de recherche avancée
 * Envoie la requête structurée au backend Rust et retourne les résultats
 */
export async function performSearch(query: SearchQuery): Promise<SearchResponse> {
  try {
    // Appel à la commande Tauri 'search_images' du backend
    const response = await invoke<SearchResponse>('search_images', {
      query,
    });
    return response;
  } catch (error) {
    console.error('Erreur lors de la recherche :', error);
    return { results: [], total: 0 };
  }
}

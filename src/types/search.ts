// Types pour la recherche avancée (phase 3.5)

export type SearchOperator = ':' | '>' | '>=' | '<' | '<=' | '=';

export interface ParsedFilter {
  field: string; // ex: 'iso', 'star', 'camera', 'lens'
  operator: SearchOperator;
  value: string | number;
}

export interface SearchQuery {
  text: string; // texte libre (filename, tags, lieu)
  filters: ParsedFilter[];
}

export interface SearchResult {
  id: string;
  filename: string;
  thumbnailPath: string;
  // autres champs pertinents (rating, camera, etc.)
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

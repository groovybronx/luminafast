import type { SearchQuery } from '@/types/search';

/**
 * Parse une chaîne utilisateur en SearchQuery (texte libre + filtres structurés)
 * Ex : "iso:>3200 star:4" → { text: '', filters: [{field:'iso',operator:'>',value:3200},{field:'star',operator:':',value:4}] }
 */
export function parseSearchQuery(input: string): SearchQuery {
  // On veut capturer : champ, opérateur (>=, <=, >, <, =, :) et valeur
  // Ex : iso:>3200 → field=iso, operator=>, value=3200
  const filterRegex = /([a-zA-Z_]+)\s*(:)\s*(>=|<=|>|<|=)?\s*([^\s]+)/g;
  const filters: import('@/types/search').ParsedFilter[] = [];
  let text = input;
  let match: RegExpExecArray | null;
  while ((match = filterRegex.exec(input)) !== null) {
    const field = match[1] ?? '';
    // match[3] = opérateur optionnel après le :
    const operator = (match[3] as import('@/types/search').SearchOperator) || ':';
    const rawValue = match[4] ?? '';
    const value = rawValue !== '' && !isNaN(Number(rawValue)) ? Number(rawValue) : rawValue;
    if (field && operator && rawValue !== undefined) {
      filters.push({ field, operator, value });
    }
    text = text.replace(match[0], '').trim();
  }
  return { text, filters };
}

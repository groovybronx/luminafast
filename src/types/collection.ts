// --- Domain Types: Collections ---

export type CollectionType = 'static' | 'smart' | 'quick';

export interface Collection {
  id: number;
  name: string;
  type: CollectionType;
  parentId: number | null;
  smartQuery: SmartQuery | null;
  createdAt: string;
  imageCount: number;
}

export interface SmartQueryRule {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number;
  valueTo?: number;
}

export interface SmartQuery {
  conjunction: 'AND' | 'OR';
  rules: SmartQueryRule[];
}

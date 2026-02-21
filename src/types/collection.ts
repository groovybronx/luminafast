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

// --- Phase 3.3: Smart Criteria types (format Rust backend) ---

export type SmartRuleField =
  | 'rating'
  | 'flag'
  | 'camera_make'
  | 'camera_model'
  | 'lens'
  | 'extension'
  | 'iso'
  | 'aperture'
  | 'shutter_speed';

export type SmartRuleOp = 'eq' | 'neq' | 'gte' | 'lte' | 'contains';

export interface SmartRule {
  field: SmartRuleField;
  op: SmartRuleOp;
  value: string | number;
}

export interface SmartCriteria {
  rules: SmartRule[];
  match: 'all' | 'any';
}

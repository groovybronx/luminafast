// --- Domain Types: Collections ---

export type CollectionType = 'static' | 'smart' | 'quick';

export type SmartQueryField =
  | 'rating'
  | 'iso'
  | 'aperture'
  | 'focal_length'
  | 'camera_make'
  | 'camera_model'
  | 'lens'
  | 'flag'
  | 'color_label'
  | 'filename';

export type SmartQueryOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with';

export interface SmartQueryRule {
  field: SmartQueryField;
  operator: SmartQueryOperator;
  value: string | number | boolean;
}

export interface SmartQuery {
  rules: SmartQueryRule[];
  combinator: 'AND' | 'OR';
}

export interface Collection {
  id: number;
  name: string;
  type: CollectionType;
  parentId: number | null;
  smartQuery: SmartQuery | null;
  createdAt: string;
  imageCount: number;
}

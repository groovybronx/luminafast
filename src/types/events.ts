// --- Domain Types: Event Sourcing ---

import type { EditState, FlagType } from './image';

export type EventType =
  | 'RATING'
  | 'FLAG'
  | 'EDIT'
  | 'EDIT_COMMIT'
  | 'ADD_TAG'
  | 'REMOVE_TAG'
  | 'TagAdded'
  | 'TagRemoved';

export type EventPayload =
  | { type: 'RATING'; value: number }
  | { type: 'FLAG'; value: FlagType }
  | { type: 'EDIT'; value: Partial<EditState> }
  | { type: 'EDIT_COMMIT'; value: Partial<EditState> }
  | { type: 'ADD_TAG'; value: string }
  | { type: 'REMOVE_TAG'; value: string }
  | { type: 'TagAdded'; value: string }
  | { type: 'TagRemoved'; value: string };

export interface CatalogEvent {
  id: string;
  timestamp: number;
  type: EventType;
  payload: EventPayload;
  targets: number[];
}

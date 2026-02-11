// --- Re-export all domain types ---

export type {
  ExifData,
  EditState,
  FlagType,
  ImageState,
  CatalogImage,
  ImageTheme,
} from './image';

export { DEFAULT_EDIT_STATE } from './image';

export type {
  CollectionType,
  Collection,
  SmartQueryRule,
  SmartQuery,
} from './collection';

export type {
  EventType,
  EventPayload,
  CatalogEvent,
} from './events';

export type {
  ActiveView,
  LogType,
  LogEntry,
  SliderParam,
} from './ui';

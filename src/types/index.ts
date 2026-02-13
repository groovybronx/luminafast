// --- Re-export all domain types ---

export * from './image';
export * from './collection';
export * from './events';
export * from './ui';
export * from './dto';
export * from './hashing';
export * from './filesystem';

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

// --- Phase 1.2: Tauri Command DTOs ---
export type {
  ImageDTO,
  ImageDetailDTO,
  ExifMetadataDTO,
  CollectionDTO,
  CreateCollectionDTO,
  ImageFilter,
  CommandResult,
} from './dto';

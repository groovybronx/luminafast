// --- Re-export all domain types ---

export * from './collection';
export * from './dto';
export * from './events';
export * from './filesystem';
export * from './folder';
export * from './hashing';
export * from './image';
export * from './preview';
export * from './ui';

export type { CatalogEvent, EventPayload, EventType } from './events';

export type { ActiveView, LogEntry, LogType, SliderParam } from './ui';

// --- Phase 1.2: Tauri Command DTOs ---
export type {
  CollectionDTO,
  CommandResult,
  CreateCollectionDTO,
  ExifMetadataDTO,
  ImageDetailDTO,
  ImageDTO,
  ImageFilter,
} from './dto';

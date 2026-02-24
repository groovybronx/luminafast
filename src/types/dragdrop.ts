/**
 * Drag & Drop types for collections and folders
 * Used in GridView (source) and LeftSidebar (targets)
 */

export type DragDataType = 'image' | 'folder' | 'collection';

/**
 * Serializable drag data for images
 * Passed in dataTransfer.setData('application/json', ...)
 */
export interface DragImageData {
  type: 'image';
  ids: number[]; // Image IDs being dragged (single or multi-select)
}

/**
 * Serializable drag data for folders
 * Used for Phase 3.4+ (dragging from FolderTree)
 */
export interface DragFolderData {
  type: 'folder';
  id: number;
  path: string;
}

/**
 * Serializable drag data for collections
 * Used for Phase 3.5+ (dragging collections or reordering)
 */
export interface DragCollectionData {
  type: 'collection';
  id: number;
  name: string;
}

/**
 * Union type for all drag data formats
 */
export type AnyDragData = DragImageData | DragFolderData | DragCollectionData;

/**
 * Drop context passed during drop events
 */
export interface DropContext {
  targetType: 'collection' | 'folder' | 'collection-item';
  targetId: number;
  timestamp: number;
}

/**
 * Helper to safely parse drag data from DataTransfer
 * Returns null if data is invalid or unparseable
 */
export function parseDragData(jsonStr: string): AnyDragData | null {
  try {
    const data = JSON.parse(jsonStr);
    // Validate type field
    if (!data || typeof data.type !== 'string') {
      return null;
    }

    // Validate based on type
    if (data.type === 'image' && Array.isArray(data.ids) && data.ids.length > 0) {
      return data as DragImageData;
    }
    if (data.type === 'folder' && typeof data.id === 'number' && typeof data.path === 'string') {
      return data as DragFolderData;
    }
    if (
      data.type === 'collection' &&
      typeof data.id === 'number' &&
      typeof data.name === 'string'
    ) {
      return data as DragCollectionData;
    }
  } catch {
    // Silently ignore parse errors
  }
  return null;
}

/**
 * Helper to check if drag data contains images
 */
export function isDragImageData(data: AnyDragData): data is DragImageData {
  return data.type === 'image' && Array.isArray((data as DragImageData).ids);
}

/**
 * Helper to check if drag data contains a folder
 */
export function isDragFolderData(data: AnyDragData): data is DragFolderData {
  return data.type === 'folder';
}

/**
 * Helper to check if drag data contains a collection
 */
export function isDragCollectionData(data: AnyDragData): data is DragCollectionData {
  return data.type === 'collection';
}

// DTOs for Tauri Commands - Phase 1.2

export interface ImageDTO {
  id: number;
  blake3_hash: string;
  filename: string;
  extension: string;
  width?: number;
  height?: number;
  rating?: number;
  flag?: string;
  captured_at?: string;
  imported_at: string;
}

export interface ImageDetailDTO extends ImageDTO {
  exif_metadata?: ExifMetadataDTO;
  folder_id?: number;
}

export interface ExifMetadataDTO {
  iso?: number;
  aperture?: number;
  shutter_speed?: number;
  focal_length?: number;
  lens?: string;
  camera_make?: string;
  camera_model?: string;
  gps_lat?: number;
  gps_lon?: number;
  color_space?: string;
}

export interface CollectionDTO {
  id: number;
  name: string;
  collection_type: 'static' | 'smart' | 'quick';
  parent_id?: number;
  image_count: number;
}

export interface CreateCollectionDTO {
  name: string;
  collection_type: 'static' | 'smart' | 'quick';
  parent_id?: number;
}

export interface ImageFilter {
  rating_min?: number;
  rating_max?: number;
  flag?: string;
  folder_id?: number;
  search_text?: string;
}

// Error type for Tauri commands
export type CommandResult<T> = T | string; // string represents error message

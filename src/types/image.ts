// --- Domain Types: Image & related data ---

export interface ExifData {
  iso: number;
  fstop: number;
  shutter: string;
  lens: string;
  camera: string;
  location: string;
}

export interface EditState {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temp: number;
  tint: number;
  vibrance: number;
  saturation: number;
  clarity: number;
}

export type FlagType = 'pick' | 'reject' | null;

export interface ImageState {
  rating: number;
  flag: FlagType;
  edits: EditState;
  isSynced: boolean;
  revision: string;
  tags: string[];
}

export interface CatalogImage {
  id: number;
  hash: string;
  filename: string;
  url: string;
  capturedAt: string;
  exif: ExifData;
  state: ImageState;
  sizeOnDisk: string;
}

export interface ImageTheme {
  term: string;
  lens: string;
  camera: string;
  tags: string[];
}

export const DEFAULT_EDIT_STATE: EditState = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  temp: 5500,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  clarity: 0,
};

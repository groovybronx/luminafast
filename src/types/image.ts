// --- Domain Types: Image & related data ---

export interface ExifData {
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
  lens?: string;
  cameraMake?: string;
  cameraModel?: string;
  gpsLat?: number;
  gpsLon?: number;
  colorSpace?: string;
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

/**
 * CatalogImage — Image du catalogue avec support pour 3 formats de preview
 *
 * Phase A: Preview Format Selection
 * Supporte une pyramide de 3 formats d'affichage :
 * - urls.thumbnail (240px) → GridView
 * - urls.standard (1440px) → DevelopView
 * - urls.oneToOne (natif) → Zoom pixel-peeping (future)
 */
export interface CatalogImage {
  id: number;
  hash: string;
  filename: string;

  /**
   * URLs des previews par format d'affichage
   *
   * @example
   * {
   *   thumbnail: "asset://previews/abc123_240.jpg",  // GridView
   *   standard: "asset://previews/abc123_1440.jpg",  // DevelopView
   *   oneToOne: "asset://previews/abc123_native.jpg" // Zoom 1:1
   * }
   */
  urls: {
    /** 240px, JPEG q75 — Preview rapide pour grille */
    thumbnail: string;
    /** 1440px, JPEG q85 — Qualité d'édition pour développement */
    standard: string;
    /** Résolution native, JPEG q90 — Zoom pixel-peeping (optionnel) */
    oneToOne?: string;
  };

  capturedAt: string;
  exif: ExifData;
  state: ImageState;
  sizeOnDisk: string;
}

/**
 * Helper pour retrouver l'URL de preview par défaut (backward compatibility)
 *
 * DEPRECATED: Utiliser `image.urls.thumbnail` directement ou `image.urls.standard` selon le contexte
 *
 * @param image L'image du catalogue
 * @returns URL de la preview thumbnail pour backward compatibility
 */
export function getImageUrl(image: CatalogImage): string {
  return image.urls.thumbnail;
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

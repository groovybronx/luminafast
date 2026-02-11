import type { CatalogImage, ImageTheme, FlagType, EditState } from '../types';

export interface MockEvent {
  id: string;
  timestamp: number;
  type: string;
  payload: number | string | FlagType | Partial<EditState>;
  targets: number[];
}

export const IMAGE_THEMES: ImageTheme[] = [
  { term: 'portrait', lens: '56mm f/1.2', camera: 'Fujifilm X-T5', tags: ['Portrait', 'Studio', 'Flash'] },
  { term: 'landscape', lens: '10-24mm f/4', camera: 'Fujifilm GFX 100II', tags: ['Nature', 'Grand Angle', 'Voyage'] },
  { term: 'architecture', lens: '23mm f/2', camera: 'Fujifilm X-T5', tags: ['Urbain', 'Lignes', 'Architecture'] },
  { term: 'street', lens: '35mm f/1.4', camera: 'Fujifilm X-Pro3', tags: ['Street', 'Noir et Blanc', 'Instant'] },
  { term: 'fashion', lens: '90mm f/2', camera: 'Fujifilm X-H2', tags: ['Mode', 'Editorial', 'Couleur'] }
];

const ISO_VALUES = [160, 400, 800, 1600, 3200, 6400, 12800] as const;
const FSTOP_VALUES = [1.2, 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16] as const;
const SHUTTER_VALUES = ['1/500', '1/2000', '1/4000', '1/125', '1/60', '1/30', '2.5s'] as const;
const LOCATION_VALUES = ['Paris, France', 'Tokyo, Japan', 'Reykjavík, Iceland', 'New York, USA'] as const;

export const generateImages = (count: number, startId: number = 0): CatalogImage[] => {
  return Array.from({ length: count }, (_, i) => {
    const id = startId + i;
    const theme = IMAGE_THEMES[id % IMAGE_THEMES.length]!;
    return {
      id: id,
      hash: `b3-${id.toString(16).padStart(12, '0')}-af92`,
      filename: `RAW_PRO_${2000 + id}.RAF`,
      url: `https://picsum.photos/seed/${id}/800/533`,
      capturedAt: new Date(2025, 1, Math.max(1, (id % 28))).toISOString(),
      exif: {
        iso: ISO_VALUES[id % ISO_VALUES.length]!,
        fstop: FSTOP_VALUES[id % FSTOP_VALUES.length]!,
        shutter: SHUTTER_VALUES[id % SHUTTER_VALUES.length]!,
        lens: theme.lens,
        camera: theme.camera,
        location: LOCATION_VALUES[id % LOCATION_VALUES.length]!
      },
      state: {
        rating: Math.floor(Math.random() * 6),
        flag: (Math.random() > 0.85 ? 'pick' : (Math.random() > 0.95 ? 'reject' : null)) as FlagType,
        edits: { 
            exposure: 0, contrast: 0, highlights: 0, shadows: 0, 
            temp: 5500, tint: 0, vibrance: 0, saturation: 0, clarity: 0 
        },
        isSynced: Math.random() > 0.4,
        revision: `v${id}.0.1-b3`,
        tags: theme.tags
      },
      sizeOnDisk: `${(Math.random() * 10 + 20).toFixed(1)} MB`
    };
  });
};

export const INITIAL_IMAGES = generateImages(60);

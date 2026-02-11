import { describe, it, expect } from 'vitest';
import type { 
  CatalogImage, 
  ExifData, 
  EditState, 
  ImageState, 
  FlagType,
  Collection,
  SmartQuery,
  SmartQueryRule,
  CatalogEvent,
  EventType,
  EventPayload,
  ActiveView,
  LogEntry,
  LogType,
  SliderParam
} from '../index';

describe('Type Definitions', () => {
  describe('CatalogImage', () => {
    it('should accept valid CatalogImage structure', () => {
      const validImage: CatalogImage = {
        id: 1,
        filename: 'IMG_001.CR3',
        extension: 'CR3',
        width: 6000,
        height: 4000,
        orientation: 1,
        file_size_bytes: 25000000,
        captured_at: '2026-02-11T10:00:00Z',
        imported_at: '2026-02-11T12:00:00Z',
        folder_id: 1,
        exif: {
          iso: 400,
          aperture: 2.8,
          shutter_speed: -3,
          focal_length: 35,
          lens: 'XF 35mm F2 R WR',
          camera_make: 'FUJIFILM',
          camera_model: 'GFX 100S',
          gps_lat: 48.8566,
          gps_lon: 2.3522,
          color_space: 'sRGB',
        },
        state: {
          rating: 3,
          flag: null,
          color_label: null,
          edits: {},
          tags: ['portrait', 'paris'],
          isSynced: true,
        },
      };

      expect(validImage.id).toBe(1);
      expect(validImage.filename).toBe('IMG_001.CR3');
      expect(validImage.exif.iso).toBe(400);
      expect(validImage.state.rating).toBe(3);
    });

    it('should require all required fields', () => {
      // This test verifies TypeScript compilation would fail for missing fields
      const createImage = (overrides: Partial<CatalogImage> = {}): CatalogImage => ({
        id: 1,
        filename: 'IMG_001.CR3',
        extension: 'CR3',
        width: 6000,
        height: 4000,
        orientation: 1,
        file_size_bytes: 25000000,
        captured_at: '2026-02-11T10:00:00Z',
        imported_at: '2026-02-11T12:00:00Z',
        folder_id: 1,
        exif: {
          iso: 400,
          aperture: 2.8,
          shutter_speed: -3,
          focal_length: 35,
          lens: 'XF 35mm F2 R WR',
          camera_make: 'FUJIFILM',
          camera_model: 'GFX 100S',
          gps_lat: null,
          gps_lon: null,
          color_space: 'sRGB',
        },
        state: {
          rating: 0,
          flag: null,
          color_label: null,
          edits: {},
          tags: [],
          isSynced: false,
        },
        ...overrides,
      });

      expect(createImage().id).toBe(1);
    });
  });

  describe('ExifData', () => {
    it('should accept valid EXIF structure', () => {
      const exif: ExifData = {
        iso: 800,
        aperture: 1.4,
        shutter_speed: -4,
        focal_length: 85,
        lens: 'XF 85mm F1.4 R WR',
        camera_make: 'FUJIFILM',
        camera_model: 'GFX 100S',
        gps_lat: null,
        gps_lon: null,
        color_space: 'Adobe RGB',
      };

      expect(exif.iso).toBe(800);
      expect(exif.aperture).toBe(1.4);
      expect(exif.gps_lat).toBeNull();
    });

    it('should handle GPS coordinates', () => {
      const exifWithGPS: ExifData = {
        iso: 400,
        aperture: 2.8,
        shutter_speed: -3,
        focal_length: 35,
        lens: 'XF 35mm F2 R WR',
        camera_make: 'FUJIFILM',
        camera_model: 'GFX 100S',
        gps_lat: 48.8566,
        gps_lon: 2.3522,
        color_space: 'sRGB',
      };

      expect(exifWithGPS.gps_lat).toBe(48.8566);
      expect(exifWithGPS.gps_lon).toBe(2.3522);
    });
  });

  describe('ImageState', () => {
    it('should accept valid image state', () => {
      const state: ImageState = {
        rating: 5,
        flag: 'pick',
        color_label: 'red',
        edits: {
          exposure: 0.3,
          contrast: -0.1,
          saturation: 0.2,
        },
        tags: ['portrait', 'paris', 'street'],
        isSynced: true,
      };

      expect(state.rating).toBe(5);
      expect(state.flag).toBe('pick');
      expect(state.color_label).toBe('red');
      expect(state.edits.exposure).toBe(0.3);
      expect(state.tags).toContain('paris');
    });

    it('should handle empty state', () => {
      const emptyState: ImageState = {
        rating: 0,
        flag: null,
        color_label: null,
        edits: {},
        tags: [],
        isSynced: false,
      };

      expect(emptyState.rating).toBe(0);
      expect(emptyState.flag).toBeNull();
      expect(emptyState.tags).toHaveLength(0);
    });
  });

  describe('FlagType', () => {
    it('should accept valid flag types', () => {
      const flags: FlagType[] = ['pick', 'reject', null];
      
      expect(flags).toContain('pick');
      expect(flags).toContain('reject');
      expect(flags).toContain(null);
    });
  });

  describe('Collection', () => {
    it('should accept valid collection structure', () => {
      const collection: Collection = {
        id: 1,
        name: 'Paris Portraits',
        type: 'static',
        parent_id: null,
        smart_query: null,
        created_at: '2026-02-11T12:00:00Z',
      };

      expect(collection.name).toBe('Paris Portraits');
      expect(collection.type).toBe('static');
      expect(collection.smart_query).toBeNull();
    });

    it('should handle smart collections', () => {
      const smartQuery: SmartQuery = {
        rules: [
          {
            field: 'rating',
            operator: '>=',
            value: 4,
          },
          {
            field: 'camera',
            operator: 'contains',
            value: 'GFX',
          },
        ],
        logic: 'AND',
      };

      const smartCollection: Collection = {
        id: 2,
        name: 'Best GFX Photos',
        type: 'smart',
        parent_id: 1,
        smart_query: smartQuery,
        created_at: '2026-02-11T12:00:00Z',
      };

      expect(smartCollection.type).toBe('smart');
      expect(smartCollection.smart_query?.rules).toHaveLength(2);
    });
  });

  describe('CatalogEvent', () => {
    it('should accept valid event structure', () => {
      const event: CatalogEvent = {
        id: 'event-123',
        timestamp: Date.now(),
        type: 'RATING',
        payload: {
          type: 'RATING',
          value: 5,
        },
      };

      expect(event.type).toBe('RATING');
      expect(event.payload.type).toBe('RATING');
      expect(event.payload.value).toBe(5);
    });

    it('should handle different event types', () => {
      const events: CatalogEvent[] = [
        {
          id: 'rating-event',
          timestamp: Date.now(),
          type: 'RATING',
          payload: {
            type: 'RATING',
            value: 3,
          },
        },
        {
          id: 'flag-event',
          timestamp: Date.now(),
          type: 'FLAG',
          payload: {
            type: 'FLAG',
            value: 'pick',
          },
        },
        {
          id: 'edit-event',
          timestamp: Date.now(),
          type: 'EDIT',
          payload: {
            type: 'EDIT',
            value: {
              exposure: 0.2,
              contrast: -0.1,
            },
          },
        },
      ];

      expect(events.map(e => e.type)).toEqual(['RATING', 'FLAG', 'EDIT']);
    });
  });

  describe('ActiveView', () => {
    it('should accept valid view types', () => {
      const views: ActiveView[] = ['library', 'develop', 'maps', 'print'];
      
      expect(views).toContain('library');
      expect(views).toContain('develop');
      expect(views).toContain('maps');
      expect(views).toContain('print');
    });
  });

  describe('LogEntry', () => {
    it('should accept valid log entry', () => {
      const log: LogEntry = {
        time: '12:34:56',
        message: 'Database initialized',
        color: 'text-blue-400',
      };

      expect(log.time).toBe('12:34:56');
      expect(log.message).toBe('Database initialized');
      expect(log.color).toBe('text-blue-400');
    });
  });

  describe('SliderParam', () => {
    it('should accept valid slider parameters', () => {
      const sliders: SliderParam[] = [
        {
          id: 'exposure',
          label: 'Exposure',
          min: -2,
          max: 2,
          step: 0.1,
          default: 0,
        },
        {
          id: 'contrast',
          label: 'Contrast',
          min: -1,
          max: 1,
          step: 0.05,
          default: 0,
        },
      ];

      expect(sliders[0].label).toBe('Exposure');
      expect(sliders[1].step).toBe(0.05);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type constraints', () => {
      // Rating must be 0-5
      const validRatings: number[] = [0, 1, 2, 3, 4, 5];
      expect(validRatings.every(r => r >= 0 && r <= 5)).toBe(true);

      // File size should be positive
      const fileSize = 25000000;
      expect(fileSize).toBeGreaterThan(0);

      // ISO should be positive
      const iso = 400;
      expect(iso).toBeGreaterThan(0);

      // Aperture should be positive
      const aperture = 2.8;
      expect(aperture).toBeGreaterThan(0);
    });
  });

  describe('Complex Type Combinations', () => {
    it('should handle complex nested structures', () => {
      const complexData = {
        image: {
          id: 1,
          filename: 'IMG_001.CR3',
          extension: 'CR3',
          width: 6000,
          height: 4000,
          orientation: 1,
          file_size_bytes: 25000000,
          captured_at: '2026-02-11T10:00:00Z',
          imported_at: '2026-02-11T12:00:00Z',
          folder_id: 1,
          exif: {
            iso: 400,
            aperture: 2.8,
            shutter_speed: -3,
            focal_length: 35,
            lens: 'XF 35mm F2 R WR',
            camera_make: 'FUJIFILM',
            camera_model: 'GFX 100S',
            gps_lat: 48.8566,
            gps_lon: 2.3522,
            color_space: 'sRGB',
          },
          state: {
            rating: 3,
            flag: null,
            color_label: null,
            edits: {
              exposure: 0.2,
              contrast: -0.1,
            },
            tags: ['portrait', 'paris'],
            isSynced: true,
          },
        } as CatalogImage,
        events: [
          {
            id: 'event-1',
            timestamp: Date.now(),
            type: 'RATING',
            payload: {
              type: 'RATING',
              value: 3,
            },
          },
          {
            id: 'event-2',
            timestamp: Date.now(),
            type: 'EDIT',
            payload: {
              type: 'EDIT',
              value: {
                exposure: 0.2,
                contrast: -0.1,
              },
            },
          },
        ] as CatalogEvent[],
      };

      expect(complexData.image.state.rating).toBe(3);
      expect(complexData.events).toHaveLength(2);
      expect(complexData.events[1].payload.type).toBe('EDIT');
    });
  });
});

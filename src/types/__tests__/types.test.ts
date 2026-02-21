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
        hash: 'b3-af92-001',
        filename: 'IMG_001.CR3',
        url: 'https://example.com/img.jpg',
        capturedAt: '2026-02-11T10:00:00Z',
        exif: {
          iso: 400,
          aperture: 2.8,
          shutterSpeed: '1/500',
          lens: 'XF 35mm F2 R WR',
          cameraModel: 'FUJIFILM GFX 100S',
        },
        state: {
          rating: 3,
          flag: null,
          edits: {
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0,
            temp: 5500,
            tint: 0,
            vibrance: 0,
            saturation: 0,
            clarity: 0,
          },
          isSynced: true,
          revision: 'v1.0.1-b3',
          tags: ['portrait', 'studio'],
        },
        sizeOnDisk: '25.0 MB',
      };

      expect(validImage.state.rating).toBe(3);
    });

    it('should require all required fields', () => {
      const createImage = (overrides: Partial<CatalogImage> = {}): CatalogImage => ({
        id: 1,
        hash: 'b3-af92-001',
        filename: 'IMG_001.CR3',
        url: 'https://example.com/img.jpg',
        capturedAt: '2026-02-11T10:00:00Z',
        exif: {
          iso: 100,
          aperture: 2.0,
          shutterSpeed: '1/125',
          lens: 'XF 23mm F2 R WR',
          cameraModel: 'FUJIFILM X-T5',
        },
        state: {
          rating: 0,
          flag: null,
          edits: {
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0,
            temp: 5500,
            tint: 0,
            vibrance: 0,
            saturation: 0,
            clarity: 0,
          },
          isSynced: false,
          revision: 'v1.0.0-b3',
          tags: [],
        },
        sizeOnDisk: '20.5 MB',
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
        shutterSpeed: '1/1000',
        lens: 'XF 85mm F1.4 R WR',
        cameraModel: 'FUJIFILM GFX 100S',
      };

      expect(exif.iso).toBe(800);
      expect(exif.aperture).toBe(1.4);
    });
  });

  describe('EditState', () => {
    it('should accept valid edit state', () => {
      const edits: EditState = {
        exposure: 15,
        contrast: -10,
        highlights: -20,
        shadows: 25,
        temp: 5600,
        tint: 2,
        vibrance: 10,
        saturation: 5,
        clarity: 8,
      };

      expect(edits.exposure).toBe(15);
      expect(edits.contrast).toBe(-10);
    });

    it('should accept zero values', () => {
      const zeroEdits: EditState = {
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

      expect(Object.values(zeroEdits).every(v => v === 0 || v === 5500)).toBe(true);
    });
  });

  describe('ImageState', () => {
    it('should accept valid image state', () => {
      const state: ImageState = {
        rating: 4,
        flag: 'pick',
        edits: {
          exposure: 10,
          contrast: 5,
          highlights: -5,
          shadows: 10,
          temp: 5800,
          tint: 1,
          vibrance: 8,
          saturation: 3,
          clarity: 5,
        },
        isSynced: true,
        revision: 'v2.1.0-b3',
        tags: ['landscape', 'sunset'],
      };

      expect(state.rating).toBe(4);
      expect(state.flag).toBe('pick');
      expect(state.tags).toContain('landscape');
    });

    it('should accept null flag', () => {
      const state: ImageState = {
        rating: 0,
        flag: null,
        edits: {
          exposure: 0,
          contrast: 0,
          highlights: 0,
          shadows: 0,
          temp: 5500,
          tint: 0,
          vibrance: 0,
          saturation: 0,
          clarity: 0,
        },
        isSynced: false,
        revision: 'v1.0.0-b3',
        tags: [],
      };

      expect(state.flag).toBeNull();
    });
  });

  describe('Collection', () => {
    it('should accept valid static collection', () => {
      const collection: Collection = {
        id: 1,
        name: 'Landscapes',
        type: 'static',
        parentId: null,
        smartQuery: null,
        createdAt: '2026-02-11T10:00:00Z',
        imageCount: 150,
      };

      expect(collection.name).toBe('Landscapes');
      expect(collection.type).toBe('static');
      expect(collection.smartQuery).toBeNull();
    });

    it('should accept valid smart collection', () => {
      const smartQuery: SmartQuery = {
        conjunction: 'AND',
        rules: [
          {
            field: 'rating',
            operator: 'greaterThan',
            value: 3,
          },
          {
            field: 'tags',
            operator: 'contains',
            value: 'portrait',
          },
        ],
      };

      const smartCollection: Collection = {
        id: 2,
        name: 'High Rated Portraits',
        type: 'smart',
        parentId: 1,
        smartQuery,
        createdAt: '2026-02-11T11:00:00Z',
        imageCount: 75,
      };

      expect(smartCollection.type).toBe('smart');
      expect(smartCollection.smartQuery?.rules).toHaveLength(2);
    });
  });

  describe('SmartQueryRule', () => {
    it('should accept valid rules', () => {
      const rules: SmartQueryRule[] = [
        {
          field: 'rating',
          operator: 'equals',
          value: 5,
        },
        {
          field: 'iso',
          operator: 'lessThan',
          value: 800,
        },
        {
          field: 'fstop',
          operator: 'between',
          value: 1.4,
          valueTo: 2.8,
        },
      ];

      expect(rules).toHaveLength(3);
      expect(rules[2]?.valueTo).toBe(2.8);
    });
  });

  describe('CatalogEvent', () => {
    it('should accept valid rating event', () => {
      const event: CatalogEvent = {
        id: 'rating-event-001',
        timestamp: Date.now(),
        type: 'RATING',
        payload: {
          type: 'RATING',
          value: 4,
        },
        targets: [1, 2, 3],
      };

      expect(event.type).toBe('RATING');
      expect(event.targets).toHaveLength(3);
    });

    it('should accept valid flag event', () => {
      const event: CatalogEvent = {
        id: 'flag-event-001',
        timestamp: Date.now(),
        type: 'FLAG',
        payload: {
          type: 'FLAG',
          value: 'pick',
        },
        targets: [4, 5],
      };

      expect(event.payload.value).toBe('pick');
    });

    it('should accept valid edit event', () => {
      const event: CatalogEvent = {
        id: 'edit-event-001',
        timestamp: Date.now(),
        type: 'EDIT',
        payload: {
          type: 'EDIT',
          value: {
            exposure: 10,
            contrast: 5,
          },
        },
        targets: [6],
      };

      if (event.payload.type === 'EDIT' && event.payload.value.exposure !== undefined) {
        expect(event.payload.value.exposure).toBe(10);
      }
    });
  });

  describe('ActiveView', () => {
    it('should accept valid views', () => {
      const views: ActiveView[] = ['library', 'develop'];
      
      expect(views).toHaveLength(2);
      expect(views.includes('library')).toBe(true);
      expect(views.includes('develop')).toBe(true);
    });
  });

  describe('LogEntry', () => {
    it('should accept valid log entry', () => {
      const log: LogEntry = {
        time: '12:34:56',
        message: 'Database initialized successfully',
        color: 'text-green-500',
      };

      expect(log.time).toBe('12:34:56');
      expect(log.color).toMatch(/^text-/);
    });
  });

  describe('SliderParam', () => {
    it('should accept valid slider parameters', () => {
      const sliders: SliderParam[] = [
        {
          label: 'Exposure',
          key: 'exposure',
          icon: () => null, // Mock icon component
        },
        {
          label: 'Contrast',
          key: 'contrast',
          icon: () => null, // Mock icon component
        },
      ];

      expect(sliders).toHaveLength(2);
      expect(sliders[0]?.label).toBe('Exposure');
      expect(sliders[1]?.key).toBe('contrast');
    });
  });

  describe('Type Guards and Validation', () => {
    it('should validate flag types', () => {
      const validFlags: FlagType[] = ['pick', 'reject', null];
      expect(validFlags).toHaveLength(3);
    });

    it('should validate event types', () => {
      const eventTypes: EventType[] = ['RATING', 'FLAG', 'EDIT', 'ADD_TAG', 'REMOVE_TAG'];
      expect(eventTypes).toHaveLength(5);
    });

    it('should validate log types', () => {
      const logTypes: LogType[] = ['info', 'sqlite', 'duckdb', 'io', 'sync'];
      expect(logTypes).toHaveLength(5);
    });
  });

  describe('Complex Data Structures', () => {
    it('should handle complex nested image data', () => {
      const complexData = {
        image: {
          id: 1,
          hash: 'b3-af92-001',
          filename: 'PORTRAIT_001.CR3',
          url: 'https://example.com/portrait.jpg',
          capturedAt: '2026-02-11T15:30:00Z',
          exif: {
            iso: 200,
            aperture: 2.0,
            shutterSpeed: '1/250',
            lens: 'XF 56mm F1.2 R WR',
            cameraModel: 'FUJIFILM X-T5',
          },
          state: {
            rating: 5,
            flag: 'pick',
            edits: {
              exposure: 15,
              contrast: 10,
              highlights: -8,
              shadows: 12,
              temp: 6000,
              tint: -2,
              vibrance: 15,
              saturation: 8,
              clarity: 10,
            },
            isSynced: true,
            revision: 'v3.2.1-b3',
            tags: ['portrait', 'studio', 'professional'],
          },
          sizeOnDisk: '45.2 MB',
        } as CatalogImage,
        events: [
          {
            id: 'event-001',
            timestamp: Date.now() - 1000,
            type: 'RATING' as EventType,
            payload: {
              type: 'RATING' as const,
              value: 5,
            },
            targets: [1],
          },
          {
            id: 'event-002',
            timestamp: Date.now(),
            type: 'EDIT' as EventType,
            payload: {
              type: 'EDIT' as const,
              value: {
                exposure: 15,
                contrast: 10,
              },
            },
            targets: [1],
          },
        ] as CatalogEvent[],
      };

      expect(complexData.image.state.rating).toBe(5);
      expect(complexData.events).toHaveLength(2);
      expect(complexData.events[1]?.payload.type).toBe('EDIT');
    });
  });
});

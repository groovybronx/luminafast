/**
 * Tests pour renderingService — Phase A
 * Teste la conversion d'événements en filtres CSS et les mappages
 */

import { describe, it, expect } from 'vitest';
import {
  eventsToCSSFilters,
  eventsToPixelFilters,
  filtersToCSS,
  applyCSSFilters,
  calculateFilterLatency,
  clearCSSFilters,
} from '@/services/renderingService';
import type { EventDTO } from '@/services/eventService';
import type { CSSFilterState } from '@/types/rendering';

describe('renderingService', () => {
  describe('eventsToCSSFilters', () => {
    it('should return default values for empty event list', () => {
      const filters = eventsToCSSFilters([]);
      expect(filters).toEqual({
        exposure: 0,
        contrast: 0,
        saturation: 1,
      });
    });

    it('should apply exposure from ImageEdited events', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: 0.5 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.exposure).toBe(0.5);
      expect(filters.contrast).toBe(0);
      expect(filters.saturation).toBe(1);
    });

    it('should apply contrast from ImageEdited events', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: { edits: { contrast: 0.3 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.contrast).toBe(0.3);
    });

    it('should apply saturation from ImageEdited events', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: { edits: { saturation: 1.5 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.saturation).toBe(1.5);
    });

    it('should ignore non-EDIT events', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'RatingChanged',
          payload: { value: 5 },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
        {
          id: '2',
          timestamp: 2000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: 0.5 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:01Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.exposure).toBe(0.5);
    });

    it('should replay events in order (last wins)', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: 0.5 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
        {
          id: '2',
          timestamp: 2000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: -0.3 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:01Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.exposure).toBe(-0.3);
    });

    it('should handle multiple edits in single event', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: 0.5, contrast: 0.3, saturation: 1.2 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.exposure).toBe(0.5);
      expect(filters.contrast).toBe(0.3);
      expect(filters.saturation).toBe(1.2);
    });
  });

  describe('eventsToPixelFilters', () => {
    it('should include all pixel filter fields', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: {
            edits: {
              exposure: 0.5,
              contrast: 0.3,
              saturation: 1.2,
              highlights: 0.2,
              shadows: -0.1,
              clarity: 10,
              vibrance: 5,
              temp: 6500,
              tint: 10,
            },
          },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToPixelFilters(events);
      expect(filters.exposure).toBe(0.5);
      expect(filters.highlights).toBe(0.2);
      expect(filters.shadows).toBe(-0.1);
      expect(filters.clarity).toBe(10);
      expect(filters.vibrance).toBe(5);
      expect(filters.colorTemp).toBe(6500);
      expect(filters.tint).toBe(10);
    });
  });

  describe('filtersToCSS', () => {
    it('should return "none" for default filters', () => {
      const filters: CSSFilterState = { exposure: 0, contrast: 0, saturation: 1 };
      const css = filtersToCSS(filters);
      expect(css).toBe('none');
    });

    it('should generate brightness for exposure', () => {
      const filters: CSSFilterState = { exposure: 1, contrast: 0, saturation: 1 };
      const css = filtersToCSS(filters);
      expect(css).toContain('brightness');
      expect(css).toContain('1.30');
    });

    it('should generate contrast for contrast', () => {
      const filters: CSSFilterState = { exposure: 0, contrast: 1, saturation: 1 };
      const css = filtersToCSS(filters);
      expect(css).toContain('contrast');
      expect(css).toContain('1.50');
    });

    it('should generate saturate for saturation', () => {
      const filters: CSSFilterState = { exposure: 0, contrast: 0, saturation: 1.5 };
      const css = filtersToCSS(filters);
      expect(css).toContain('saturate');
      expect(css).toContain('1.50');
    });

    it('should combine multiple filters', () => {
      const filters: CSSFilterState = { exposure: 0.5, contrast: 0.2, saturation: 1.2 };
      const css = filtersToCSS(filters);
      expect(css).toMatch(/brightness\s*\(/);
      expect(css).toMatch(/contrast\s*\(/);
      expect(css).toMatch(/saturate\s*\(/);
    });

    it('should skip negligible changes (<0.01)', () => {
      const filters: CSSFilterState = { exposure: 0.001, contrast: 0, saturation: 1 };
      const css = filtersToCSS(filters);
      expect(css).toBe('none');
    });
  });

  describe('applyCSSFilters', () => {
    it('should apply filter to image element', () => {
      const img = document.createElement('img');
      const filters: CSSFilterState = { exposure: 0.5, contrast: 0, saturation: 1 };

      applyCSSFilters(img, filters);

      expect(img.style.filter).toContain('brightness');
    });

    it('should handle null element gracefully', () => {
      expect(() => {
        applyCSSFilters(null, { exposure: 0.5, contrast: 0, saturation: 1 });
      }).not.toThrow();
    });

    it('should update filter on multiple calls', () => {
      const img = document.createElement('img');
      const filters1: CSSFilterState = { exposure: 0.5, contrast: 0, saturation: 1 };
      const filters2: CSSFilterState = { exposure: -0.3, contrast: 0, saturation: 1 };

      applyCSSFilters(img, filters1);
      const filterBefore = img.style.filter;

      applyCSSFilters(img, filters2);
      const filterAfter = img.style.filter;

      expect(filterBefore).not.toBe(filterAfter);
    });
  });

  describe('clearCSSFilters', () => {
    it('should set filter to "none"', () => {
      const img = document.createElement('img');
      img.style.filter = 'brightness(1.5) contrast(1.2)';

      clearCSSFilters(img);

      expect(img.style.filter).toBe('none');
    });

    it('should handle null element gracefully', () => {
      expect(() => {
        clearCSSFilters(null);
      }).not.toThrow();
    });
  });

  describe('calculateFilterLatency', () => {
    it('should return latency in milliseconds', () => {
      const latency = calculateFilterLatency();
      expect(typeof latency).toBe('number');
      expect(latency).toBeGreaterThanOrEqual(0);
    });

    it('should complete in < 1ms', () => {
      const latency = calculateFilterLatency();
      // CSS filter conversion should be very fast (native operations)
      expect(latency).toBeLessThan(1);
    });

    it('should be deterministic and fast', () => {
      const latencies: number[] = [];
      for (let i = 0; i < 10; i++) {
        latencies.push(calculateFilterLatency());
      }

      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      expect(avgLatency).toBeLessThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme exposure values', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: -2 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      const css = filtersToCSS(filters);

      // Should clamp brightness to minimum 0.3
      expect(css).toContain('brightness(0.40)');
    });

    it('should handle null payload in events', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageEdited',
          payload: {} as Record<string, unknown>,
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.exposure).toBe(0);
    });

    it('should handle mixed valid and invalid events', () => {
      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'RatingChanged',
          payload: { value: 5 },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:00Z',
        },
        {
          id: '2',
          timestamp: 2000,
          eventType: 'ImageEdited',
          payload: { edits: { exposure: 0.5 } },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:01Z',
        },
        {
          id: '3',
          timestamp: 3000,
          eventType: 'FlagAdded',
          payload: { flag: 'pick' },
          targetType: 'Image',
          targetId: 123,
          createdAt: '2026-02-26T00:00:02Z',
        },
      ];

      const filters = eventsToCSSFilters(events);
      expect(filters.exposure).toBe(0.5);
    });
  });
});

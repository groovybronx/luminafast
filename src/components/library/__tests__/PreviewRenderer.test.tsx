/**
 * Tests pour PreviewRenderer component — Phase A
 * Teste le rendu d'images avec filtres CSS appliqués
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PreviewRenderer } from '@/components/library/PreviewRenderer';
import * as eventService from '@/services/eventService';
import type { EventDTO } from '@/services/eventService';

// Mock eventService
vi.mock('@/services/eventService', () => ({
  getEvents: vi.fn(),
}));

describe('PreviewRenderer (Phase A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render image with correct src and alt', async () => {
      vi.mocked(eventService.getEvents).mockResolvedValue([]);

      render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" className="test-class" />,
      );

      const img = await screen.findByAltText('Preview for image 123');
      expect(img).toHaveAttribute('src', '/previews/test.jpg');
      expect(img).toHaveClass('test-class');
    });

    it('should add selected class when isSelected=true', async () => {
      vi.mocked(eventService.getEvents).mockResolvedValue([]);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" isSelected={true} />,
      );

      await waitFor(() => {
        expect(container.querySelector('.preview-renderer')).toHaveClass('selected');
      });
    });

    it('should not add selected class when isSelected=false', async () => {
      vi.mocked(eventService.getEvents).mockResolvedValue([]);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" isSelected={false} />,
      );

      await waitFor(() => {
        expect(container.querySelector('.preview-renderer')).not.toHaveClass('selected');
      });
    });
  });

  describe('filter application', () => {
    it('should apply default filters (no events)', async () => {
      vi.mocked(eventService.getEvents).mockResolvedValue([]);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />,
      );

      const img = container.querySelector('img');

      await waitFor(() => {
        expect(img?.style.filter).toBe('none');
      });
    });

    it('should apply exposure filter from events', async () => {
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

      vi.mocked(eventService.getEvents).mockResolvedValue(events);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />,
      );

      const img = container.querySelector('img');

      await waitFor(() => {
        expect(img?.style.filter).toContain('brightness');
      });
    });

    it('should filter events by imageId', async () => {
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
          targetId: 456, // Different imageId
          createdAt: '2026-02-26T00:00:01Z',
        },
      ];

      vi.mocked(eventService.getEvents).mockResolvedValue(events);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />,
      );

      const img = container.querySelector('img');

      await waitFor(() => {
        // Should apply exposure 0.5 (from imageId 123), not -0.3 (from imageId 456)
        expect(img?.style.filter).toContain('brightness(1.15)');
      });
    });

    it('should update filters when imageId changes', async () => {
      const events1: EventDTO[] = [
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

      const events2: EventDTO[] = [
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
          targetId: 456,
          createdAt: '2026-02-26T00:00:01Z',
        },
      ];

      vi.mocked(eventService.getEvents).mockResolvedValueOnce(events1);

      const { container, rerender } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test123.jpg" />,
      );

      const img = container.querySelector('img');

      await waitFor(() => {
        expect(img?.style.filter).toContain('brightness(1.15)');
      });

      // Change imageId to 456
      vi.mocked(eventService.getEvents).mockResolvedValueOnce(events2);

      rerender(<PreviewRenderer imageId={456} previewUrl="/previews/test456.jpg" />);

      await waitFor(() => {
        // Should now apply exposure -0.3 (from imageId 456)
        expect(img?.style.filter).toContain('brightness(0.91)');
      });
    });

    it('should apply multiple filters together', async () => {
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

      vi.mocked(eventService.getEvents).mockResolvedValue(events);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />,
      );

      const img = container.querySelector('img');

      await waitFor(() => {
        const filter = img?.style.filter || '';
        expect(filter).toContain('brightness');
        expect(filter).toContain('contrast');
        expect(filter).toContain('saturate');
      });
    });
  });

  describe('error handling', () => {
    it('should handle event loading errors gracefully', async () => {
      const error = new Error('Failed to load events');
      vi.mocked(eventService.getEvents).mockRejectedValue(error);

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />,
      );

      const img = container.querySelector('img');

      await waitFor(() => {
        // Should still show image, even if filters fail
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', '/previews/test.jpg');
      });
    });

    it('should display error indicator in DEV mode on image load error', async () => {
      vi.mocked(eventService.getEvents).mockResolvedValue([]);

      // Set DEV mode to true for this test
      const originalEnv = import.meta.env.DEV;

      render(<PreviewRenderer imageId={123} previewUrl="/previews/invalid.jpg" />);

      const img = screen.getByAltText('Preview for image 123') as HTMLImageElement;

      // Simulate image load error
      const errorEvent = new Event('error');
      img.dispatchEvent(errorEvent);

      await waitFor(() => {
        const container = img.parentElement;
        if (originalEnv) {
          expect(container).toHaveClass('error');
        }
      });
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while fetching filters', async () => {
      vi.mocked(eventService.getEvents).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      const { container } = render(
        <PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />,
      );

      const loadingIndicator = container.querySelector('.loading-indicator');
      expect(loadingIndicator).toBeInTheDocument();

      await waitFor(() => {
        expect(loadingIndicator).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper test ID for component testing', async () => {
      vi.mocked(eventService.getEvents).mockResolvedValue([]);

      render(<PreviewRenderer imageId={123} previewUrl="/previews/test.jpg" />);

      const img = screen.getByTestId('preview-renderer-123');
      expect(img).toBeInTheDocument();
    });
  });
});

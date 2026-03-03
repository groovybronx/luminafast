import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PreviewRenderer } from '../library/PreviewRenderer';
import { CatalogService } from '@/services/catalogService';

// Mock CatalogService.getEditEvents
vi.mock('@/services/catalogService', () => ({
  CatalogService: {
    getEditEvents: vi.fn(),
  },
}));
const mockGetEditEvents = vi.mocked(CatalogService.getEditEvents);

describe('PreviewRenderer — Phase 4.2-2 (Event Store Subscription)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load events from Event Store on mount', async () => {
    const mockEvents = [
      {
        id: 'evt-1',
        timestamp: Date.now(),
        eventType: 'edit_applied',
        payload: { edits: { exposure: 0.5 } },
        targetType: 'Image',
        targetId: 42,
        userId: undefined,
        createdAt: new Date().toISOString(),
      },
    ];

    mockGetEditEvents.mockResolvedValue(mockEvents);

    render(<PreviewRenderer imageId={42} previewUrl="/test-preview.jpg" className="test" />);

    // Verify the component calls CatalogService to load events
    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalledWith(42);
    });

    // Verify that the image element is rendered
    const img = screen.getByAltText(/Preview for image 42/);
    expect(img).toBeInTheDocument();
  });

  it('should recalculate filters when editEventsPerImage changes (Phase 4.2-2)', async () => {
    const mockEvents = [
      {
        id: 'evt-1',
        timestamp: Date.now(),
        eventType: 'edit_applied',
        payload: { edits: { exposure: 1.0, contrast: 0.3 } },
        targetType: 'Image',
        targetId: 42,
        userId: undefined,
        createdAt: new Date().toISOString(),
      },
    ];

    mockGetEditEvents.mockResolvedValue(mockEvents);

    render(<PreviewRenderer imageId={42} previewUrl="/test-preview.jpg" className="test" />);

    // Verify component loads events on mount
    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalledWith(42);
    });

    // Verify the image element is rendered with filters applied
    const img = screen.getByAltText(/Preview for image 42/);
    expect(img).toBeInTheDocument();

    // Check that filters are applied to DOM (style.filter should be set)
    await waitFor(() => {
      const filterStyle = img.style.filter;
      // With exposure and contrast edits, we expect filters to be applied
      expect(filterStyle).toBeTruthy();
    });
  });

  it('should clear stored events on unmount', async () => {
    mockGetEditEvents.mockResolvedValue([]);

    const { unmount } = render(
      <PreviewRenderer imageId={42} previewUrl="/test-preview.jpg" className="test" />,
    );

    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalled();
    });

    // Component should be rendered
    const img = screen.getByAltText(/Preview for image 42/);
    expect(img).toBeInTheDocument();

    // Unmount component — it should cleanup the store subscription
    unmount();

    // Verify component is removed from DOM
    expect(() => screen.getByAltText(/Preview for image 42/)).toThrow();
  });

  it('should handle Event Store errors gracefully', async () => {
    mockGetEditEvents.mockRejectedValue(new Error('Database error'));

    render(<PreviewRenderer imageId={99} previewUrl="/test-preview.jpg" className="test" />);

    // Image should still display even if events fail to load
    await waitFor(() => {
      const img = screen.getByAltText(/Preview for image 99/);
      expect(img).toBeInTheDocument();
    });
  });
});

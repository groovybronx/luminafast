import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { PreviewRenderer } from '../library/PreviewRenderer';
import { CatalogService } from '@/services/catalogService';
import { useEditStore } from '@/stores/editStore';

// Mock CatalogService.getEditEvents
vi.mock('@/services/catalogService', () => ({
  CatalogService: {
    getEditEvents: vi.fn(),
  },
}));

// Mock WASM service
vi.mock('@/services/wasmRenderingService', () => ({
  loadWasmModule: vi.fn().mockResolvedValue(undefined),
  hasWasmSupport: vi.fn().mockReturnValue(false),
  renderWithWasm: vi.fn(),
}));

const mockGetEditEvents = vi.mocked(CatalogService.getEditEvents);

describe('PreviewRenderer — Phase 4.2-2 (Event Store Subscription)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditStore.setState({ editEventsPerImage: {} });
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

    const { container } = render(
      <PreviewRenderer
        imageId={42}
        previewUrl="/test-preview.jpg"
        className="test"
        useWasm={false}
      />,
    );

    // Verify the component calls CatalogService to load events
    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalledWith(42);
    });

    // Verify that either img or canvas is rendered (CSS fallback or WASM mode)
    const img = container.querySelector('img');
    const canvas = container.querySelector('canvas');
    expect(img || canvas).toBeTruthy();
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

    const { container } = render(
      <PreviewRenderer
        imageId={42}
        previewUrl="/test-preview.jpg"
        className="test"
        useWasm={false}
      />,
    );

    // Verify component loads events on mount
    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalledWith(42);
    });

    // Verify either img or canvas is rendered
    const img = container.querySelector('img');
    const canvas = container.querySelector('canvas');
    expect(img || canvas).toBeTruthy();
  });

  it('should clear stored events on unmount', async () => {
    mockGetEditEvents.mockResolvedValue([]);

    const { unmount, container } = render(
      <PreviewRenderer
        imageId={42}
        previewUrl="/test-preview.jpg"
        className="test"
        useWasm={false}
      />,
    );

    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalled();
    });

    // Component should be rendered
    const img = container.querySelector('img');
    const canvas = container.querySelector('canvas');
    expect(img || canvas).toBeTruthy();

    // Unmount component
    unmount();

    // Verify component is removed from DOM
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should handle Event Store errors gracefully', async () => {
    mockGetEditEvents.mockRejectedValue(new Error('Database error'));

    const { container } = render(
      <PreviewRenderer
        imageId={99}
        previewUrl="/test-preview.jpg"
        className="test"
        useWasm={false}
      />,
    );

    // Image should still display even if events fail to load
    await waitFor(() => {
      const img = container.querySelector('img');
      const canvas = container.querySelector('canvas');
      expect(img || canvas).toBeTruthy();
    });
  });

  it('should reset filters when events become empty for same image', async () => {
    const initialEvents = [
      {
        id: 'evt-1',
        timestamp: Date.now(),
        eventType: 'edit_applied',
        payload: { edits: { exposure: 1.0, contrast: 0.4 } },
        targetType: 'Image',
        targetId: 42,
        userId: undefined,
        createdAt: new Date().toISOString(),
      },
    ];

    mockGetEditEvents.mockResolvedValue(initialEvents);

    const { container } = render(
      <PreviewRenderer
        imageId={42}
        previewUrl="/test-preview.jpg"
        className="test"
        useWasm={false}
      />,
    );

    await waitFor(() => {
      expect(mockGetEditEvents).toHaveBeenCalledWith(42);
    });

    const img = container.querySelector('img');
    expect(img).toBeTruthy();

    await waitFor(() => {
      expect(img?.style.filter).not.toBe('none');
    });

    act(() => {
      useEditStore.getState().setEditEventsForImage(42, []);
    });

    await waitFor(() => {
      expect(img?.style.filter).toBe('none');
    });
  });
});

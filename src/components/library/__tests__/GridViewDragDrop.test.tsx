import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LazyLoadedImageCard } from '../LazyLoadedImageCard';
import type { CatalogImage } from '../../../types';
import { DEFAULT_EDIT_STATE } from '../../../types/image';

/**
 * Tests for drag & drop functionality in GridView (source side)
 * Phase 3.2b: Image dragging with multi-select support
 *
 * Note: Full drag & drop integration tested in E2E.
 * Unit tests focus on component rendering and event handler setup.
 */

// Mock IntersectionObserver for LazyLoadedImageCard
class MockIntersectionObserver {
  constructor(public callback: IntersectionObserverCallback) {}
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

describe('GridView Drag & Drop (Source)', () => {
  const mockImage: CatalogImage = {
    id: 1,
    filename: 'IMG_0001.CR3',
    hash: 'abc123',
    url: 'blob:image',
    capturedAt: '2026-02-24T10:00:00Z',
    sizeOnDisk: '1.5 MB',
    state: {
      isSynced: true,
      rating: 4,
      flag: null,
      edits: DEFAULT_EDIT_STATE,
      revision: '1',
      tags: [],
    },
    exif: {
      iso: 100,
      aperture: 2.8,
      shutterSpeed: '1/100',
      focalLength: 50,
      cameraMake: 'Canon',
      cameraModel: 'R5',
      lens: 'RF 50mm',
    },
  };

  it('should render with image filename visible', () => {
    const mockOnToggleSelection = vi.fn();
    const mockOnSetActiveView = vi.fn();

    render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={200}
        itemHeight={150}
        selectedImageIds={[]}
        onToggleSelection={mockOnToggleSelection}
        onSetActiveView={mockOnSetActiveView}
      />,
    );

    // Verify image filename is displayed
    expect(screen.getByText(mockImage.filename)).toBeDefined();
  });

  it('should display grab cursor by default', () => {
    const mockOnToggleSelection = vi.fn();
    const mockOnSetActiveView = vi.fn();

    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={200}
        itemHeight={150}
        selectedImageIds={[]}
        onToggleSelection={mockOnToggleSelection}
        onSetActiveView={mockOnSetActiveView}
      />,
    );

    const cardElement = container.querySelector('[class*="cursor-grab"]');
    expect(cardElement).toBeTruthy();
  });

  it('should accept selectedImageIds prop for multi-select', () => {
    const mockOnToggleSelection = vi.fn();
    const mockOnSetActiveView = vi.fn();
    const selectedIds = [1, 2, 3];

    render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={true}
        itemWidth={200}
        itemHeight={150}
        selectedImageIds={selectedIds}
        onToggleSelection={mockOnToggleSelection}
        onSetActiveView={mockOnSetActiveView}
      />,
    );

    // Verify component renders without error with multi-select
    expect(screen.getByText(mockImage.filename)).toBeDefined();
  });

  it('should support rendering with many selected images', () => {
    const mockOnToggleSelection = vi.fn();
    const mockOnSetActiveView = vi.fn();
    const selectedIds = Array.from({ length: 100 }, (_, i) => i + 1);

    render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={true}
        itemWidth={200}
        itemHeight={150}
        selectedImageIds={selectedIds}
        onToggleSelection={mockOnToggleSelection}
        onSetActiveView={mockOnSetActiveView}
      />,
    );

    // Card should render correctly even with 100+ selected items
    expect(screen.getByText(mockImage.filename)).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevelopView } from '../DevelopView';
import type { CatalogImage } from '../../../types';

// Mock PreviewRenderer to avoid complex dependencies
vi.mock('../library/PreviewRenderer', () => ({
  default: () => <div>Preview Renderer Mock</div>,
}));

describe('DevelopView - Integration (Phase 4.4)', () => {
  const mockImage: CatalogImage = {
    id: 1,
    hash: 'abc123def456',
    filename: 'test.jpg',
    urls: {
      thumbnail: 'asset://previews/test_240.jpg',
      standard: 'asset://previews/test_1440.jpg',
    },
    capturedAt: '2025-03-02T12:00:00Z',
    exif: {
      iso: undefined,
      aperture: undefined,
      shutterSpeed: undefined,
      focalLength: undefined,
      lens: undefined,
      cameraMake: undefined,
      cameraModel: undefined,
      gpsLat: undefined,
      gpsLon: undefined,
      colorSpace: undefined,
    },
    sizeOnDisk: '2.5 MB',
    state: {
      isSynced: true,
      rating: 0,
      flag: null,
      revision: '1.0',
      tags: [],
      edits: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        clarity: 0,
        vibrance: 0,
        saturation: 0,
        temp: 0,
        tint: 0,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render BeforeAfterComparison when showBeforeAfter is true', () => {
    render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    // BeforeAfterComparison should render with mode buttons
    expect(screen.getByRole('button', { name: 'Split' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overlay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Side-by-Side' })).toBeInTheDocument();
  });

  it('should display all three comparison mode buttons', () => {
    render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    const splitBtn = screen.getByRole('button', { name: 'Split' });
    const overlayBtn = screen.getByRole('button', { name: 'Overlay' });
    const sideBySideBtn = screen.getByRole('button', { name: 'Side-by-Side' });

    expect(splitBtn).toBeInTheDocument();
    expect(overlayBtn).toBeInTheDocument();
    expect(sideBySideBtn).toBeInTheDocument();
  });

  it('should start with split mode highlighted', () => {
    render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    const splitBtn = screen.getByRole('button', { name: 'Split' });
    expect(splitBtn).toHaveClass('bg-blue-600');
  });

  it('should switch to overlay mode when button clicked', () => {
    render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    const overlayBtn = screen.getByRole('button', { name: 'Overlay' });
    fireEvent.click(overlayBtn);

    // Overlay mode should be active
    expect(overlayBtn).toHaveClass('bg-blue-600');
    // Overlay mode should show opacity slider
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('should switch to side-by-side mode when button clicked', () => {
    render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    const sideBySideBtn = screen.getByRole('button', { name: 'Side-by-Side' });
    fireEvent.click(sideBySideBtn);

    // Side-by-side mode should be active
    expect(sideBySideBtn).toHaveClass('bg-blue-600');
  });

  it('should render with dark theme styling', () => {
    const { container } = render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    const mainDiv = container.querySelector('.bg-zinc-950');
    expect(mainDiv).toBeInTheDocument();
  });

  it('should pass image to comparison component', () => {
    render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    // Component should render successfully with image
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should render full-height container', () => {
    const { container } = render(<DevelopView activeImg={mockImage} showBeforeAfter={true} />);

    const mainDiv = container.querySelector('.h-full.flex');
    expect(mainDiv).toBeInTheDocument();
  });
});

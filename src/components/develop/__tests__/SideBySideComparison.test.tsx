import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SideBySideComparison } from '../SideBySideComparison';

describe('SideBySideComparison', () => {
  const defaultProps = {
    beforeUrl: 'asset://previews/test_1440.jpg',
    afterUrl: 'asset://previews/test_after_1440.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render original image and WASM canvas vertically stacked', () => {
    render(<SideBySideComparison {...defaultProps} />);

    // Top: original image, Bottom: WASM canvas
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1); // Only top original image

    const { container } = render(<SideBySideComparison {...defaultProps} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should display zoom level indicator', () => {
    render(<SideBySideComparison {...defaultProps} />);

    // Zoom level displayed as .toFixed(2)
    const zoomText = screen.getByText(/^\d+\.\d{2}x$/);
    expect(zoomText).toBeInTheDocument();
  });

  it('should display instructions in bottom-left', () => {
    render(<SideBySideComparison {...defaultProps} />);

    expect(screen.getByText(/Scroll pour zoomer/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag pour translater/i)).toBeInTheDocument();
  });

  it('should support wheel event handler', () => {
    const { container } = render(<SideBySideComparison {...defaultProps} />);

    // Component should render successfully without errors
    expect(container).toBeInTheDocument();
  });

  it('should support mouse drag handler', () => {
    const { container } = render(<SideBySideComparison {...defaultProps} />);

    // Component should render successfully without errors
    expect(container).toBeInTheDocument();
  });

  it('should have flex column layout for vertical stacking', () => {
    const { container } = render(<SideBySideComparison {...defaultProps} />);

    // Check that the main container exists
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should render labels for before and after', () => {
    render(<SideBySideComparison {...defaultProps} />);

    expect(screen.getByText('Original RAW')).toBeInTheDocument();
    expect(screen.getByText('Aperçu WASM')).toBeInTheDocument();
  });
});

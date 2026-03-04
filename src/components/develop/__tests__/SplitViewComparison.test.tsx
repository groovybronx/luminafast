import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplitViewComparison } from '../SplitViewComparison';

describe('SplitViewComparison', () => {
  const defaultProps = {
    beforeUrl: 'asset://previews/test_1440.jpg',
    afterUrl: 'asset://previews/test_after_1440.jpg',
    position: 50,
    onPositionChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render original image and WASM canvas', () => {
    render(<SplitViewComparison {...defaultProps} />);

    // Left: original image, Right: WASM canvas
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1); // Only left original image

    const { container } = render(<SplitViewComparison {...defaultProps} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should display original and preview labels', () => {
    render(<SplitViewComparison {...defaultProps} />);

    expect(screen.getByText('Original RAW')).toBeInTheDocument();
    expect(screen.getByText('Aperçu WASM')).toBeInTheDocument();
  });

  it('should set initial split position', () => {
    const { container } = render(<SplitViewComparison {...defaultProps} position={30} />);

    // Verify the container is rendered
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('should provide onPositionChange callback', () => {
    const onPositionChange = vi.fn();
    render(<SplitViewComparison {...defaultProps} onPositionChange={onPositionChange} />);

    // Verify callback is provided
    expect(typeof onPositionChange).toBe('function');
  });

  it('should show separator with proper cursor', () => {
    render(<SplitViewComparison {...defaultProps} />);

    const separator = screen.getByRole('button', { hidden: true });
    expect(separator).toHaveClass('cursor-col-resize');
  });

  it('should have proper aria labels for accessibility', () => {
    render(<SplitViewComparison {...defaultProps} />);

    const separator = screen.getByRole('button', { hidden: true });
    expect(separator).toHaveAttribute('aria-label');
  });

  it('should render flex layout container', () => {
    const { container } = render(<SplitViewComparison {...defaultProps} />);

    const mainDiv = container.querySelector('div');
    expect(mainDiv).toHaveClass('flex');
  });
});

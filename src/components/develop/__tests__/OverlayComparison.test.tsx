import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlayComparison } from '../OverlayComparison';

describe('OverlayComparison', () => {
  const defaultProps = {
    beforeUrl: 'asset://previews/test_1440.jpg',
    afterUrl: 'asset://previews/test_after_1440.jpg',
    opacity: 50,
    onOpacityChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render original image and WASM canvas overlay', () => {
    const { container } = render(<OverlayComparison {...defaultProps} />);

    // Background: original image, Overlay: WASM canvas
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1); // Only background original image

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should display opacity slider', () => {
    render(<OverlayComparison {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should set initial opacity value', () => {
    render(<OverlayComparison {...defaultProps} opacity={75} />);

    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('75');
  });

  it('should update opacity on slider change', () => {
    const onOpacityChange = vi.fn();
    render(<OverlayComparison {...defaultProps} onOpacityChange={onOpacityChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '25' } });

    expect(onOpacityChange).toHaveBeenCalledWith(25);
  });

  it('should display opacity percentage', () => {
    render(<OverlayComparison {...defaultProps} opacity={60} />);

    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('should set opacity range attributes', () => {
    render(<OverlayComparison {...defaultProps} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
  });

  it('should have flex column layout container', () => {
    const { container } = render(<OverlayComparison {...defaultProps} />);

    const mainDiv = container.querySelector('div');
    expect(mainDiv).toHaveClass('flex', 'flex-col');
  });

  it('should set opacity style on WASM canvas overlay', () => {
    const { container } = render(<OverlayComparison {...defaultProps} opacity={30} />);

    const canvas = container.querySelector('canvas');
    // Check that canvas is absolutely positioned and has opacity style
    expect(canvas).toHaveClass('absolute');
    expect(canvas).toHaveStyle({ opacity: '0.3' });
  });
});

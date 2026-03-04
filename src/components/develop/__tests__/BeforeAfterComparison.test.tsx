import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeforeAfterComparison } from '../BeforeAfterComparison';

describe('BeforeAfterComparison', () => {
  const defaultProps = {
    imageId: 1,
    beforeUrl: 'asset://previews/test_1440.jpg',
    afterUrl: 'asset://previews/test_after_1440.jpg',
    mode: 'split' as const,
    onModeChange: vi.fn(),
    splitPosition: 50,
    onSplitPositionChange: vi.fn(),
    opacity: 50,
    onOpacityChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render mode selector buttons', () => {
    render(<BeforeAfterComparison {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Split' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overlay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Side-by-Side' })).toBeInTheDocument();
  });

  it('should highlight active mode button', () => {
    render(<BeforeAfterComparison {...defaultProps} mode="split" />);

    const splitButton = screen.getByRole('button', { name: 'Split' });
    expect(splitButton).toHaveClass('bg-blue-600');
  });

  it('should call onModeChange when mode button clicked', () => {
    const onModeChange = vi.fn();
    render(<BeforeAfterComparison {...defaultProps} onModeChange={onModeChange} />);

    const overlayButton = screen.getByRole('button', { name: 'Overlay' });
    fireEvent.click(overlayButton);

    expect(onModeChange).toHaveBeenCalledWith('overlay');
  });

  it('should render SplitViewComparison when mode is split', () => {
    const { container } = render(<BeforeAfterComparison {...defaultProps} mode="split" />);

    // Split mode should render: 1 img (left original) + 1 canvas (right WASM)
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render OverlayComparison when mode is overlay', () => {
    render(<BeforeAfterComparison {...defaultProps} mode="overlay" />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render SideBySideComparison when mode is sideBySide', () => {
    render(<BeforeAfterComparison {...defaultProps} mode="sideBySide" />);

    // Side-by-side should show zoom level indicator
    expect(screen.getByText(/1\.00/)).toBeInTheDocument();
  });

  it('should switch between modes', () => {
    const { rerender } = render(<BeforeAfterComparison {...defaultProps} mode="split" />);

    // Initially split mode
    expect(screen.getByRole('button', { name: 'Split' })).toHaveClass('bg-blue-600');

    // Switch to overlay
    rerender(<BeforeAfterComparison {...defaultProps} mode="overlay" />);
    expect(screen.getByRole('button', { name: 'Overlay' })).toHaveClass('bg-blue-600');
  });

  it('should have proper button styling when inactive', () => {
    render(<BeforeAfterComparison {...defaultProps} mode="split" />);

    const overlayButton = screen.getByRole('button', { name: 'Overlay' });
    expect(overlayButton).toHaveClass('bg-zinc-800');
  });

  it('should have flex column layout', () => {
    const { container } = render(<BeforeAfterComparison {...defaultProps} />);

    const mainDiv = container.querySelector('.flex.flex-col');
    expect(mainDiv).toBeInTheDocument();
  });

  it('should render mode selector in header section', () => {
    const { container } = render(<BeforeAfterComparison {...defaultProps} />);

    const header = container.querySelector('.shrink-0.p-3.bg-zinc-900');
    expect(header).toBeInTheDocument();
    expect(header).toContainElement(screen.getByRole('button', { name: 'Split' }));
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevelopSliders } from '../DevelopSliders';
import type { CatalogImage } from '@/types';

describe('DevelopSliders', () => {
  const mockActiveImg: CatalogImage = {
    id: 100,
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

  it('should dispatch EDIT event on slider change', () => {
    const mockDispatch = vi.fn();

    render(<DevelopSliders activeImg={mockActiveImg} onDispatchEvent={mockDispatch} />);

    const exposureSlider = screen.getByLabelText('Exposition');
    fireEvent.change(exposureSlider, { target: { value: '50' } });

    expect(mockDispatch).toHaveBeenCalledWith('EDIT', { exposure: 50 });
  });

  it('should dispatch EDIT_COMMIT on slider release (pointerUp)', () => {
    const mockDispatch = vi.fn();

    render(<DevelopSliders activeImg={mockActiveImg} onDispatchEvent={mockDispatch} />);

    const tintSlider = screen.getByLabelText('Teinte');

    // Simulate dragging slider
    fireEvent.change(tintSlider, { target: { value: '10' } });
    fireEvent.change(tintSlider, { target: { value: '20' } });
    fireEvent.change(tintSlider, { target: { value: '30' } });

    // Release slider
    fireEvent.pointerUp(tintSlider);

    // Should have multiple EDIT events (optimistic UI updates)
    expect(mockDispatch).toHaveBeenCalledWith('EDIT', { tint: 10 });
    expect(mockDispatch).toHaveBeenCalledWith('EDIT', { tint: 20 });
    expect(mockDispatch).toHaveBeenCalledWith('EDIT', { tint: 30 });

    // Should have ONE EDIT_COMMIT event (persistence)
    const commitCalls = mockDispatch.mock.calls.filter((call) => call[0] === 'EDIT_COMMIT');
    expect(commitCalls).toHaveLength(1);
    expect(commitCalls[0]).toBeDefined();
    expect(commitCalls[0]![1]).toEqual({ tint: 30 });
  });

  it('should dispatch EDIT_COMMIT on mouseUp', () => {
    const mockDispatch = vi.fn();

    render(<DevelopSliders activeImg={mockActiveImg} onDispatchEvent={mockDispatch} />);

    const contrastSlider = screen.getByLabelText('Contraste');

    fireEvent.change(contrastSlider, { target: { value: '-25' } });
    fireEvent.mouseUp(contrastSlider);

    expect(mockDispatch).toHaveBeenCalledWith('EDIT', { contrast: -25 });
    expect(mockDispatch).toHaveBeenCalledWith('EDIT_COMMIT', { contrast: -25 });
  });

  it('should dispatch EDIT_COMMIT on blur', () => {
    const mockDispatch = vi.fn();

    render(<DevelopSliders activeImg={mockActiveImg} onDispatchEvent={mockDispatch} />);

    const claritySlider = screen.getByLabelText('Clarté');

    fireEvent.change(claritySlider, { target: { value: '40' } });
    fireEvent.blur(claritySlider);

    expect(mockDispatch).toHaveBeenCalledWith('EDIT', { clarity: 40 });
    expect(mockDispatch).toHaveBeenCalledWith('EDIT_COMMIT', { clarity: 40 });
  });

  it('should not dispatch EDIT_COMMIT if no changes made', () => {
    const mockDispatch = vi.fn();

    render(<DevelopSliders activeImg={mockActiveImg} onDispatchEvent={mockDispatch} />);

    const exposureSlider = screen.getByLabelText('Exposition');

    // Just release without changing
    fireEvent.pointerUp(exposureSlider);

    // Should have no calls
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should accumulate multiple slider changes in one EDIT_COMMIT', () => {
    const mockDispatch = vi.fn();

    render(<DevelopSliders activeImg={mockActiveImg} onDispatchEvent={mockDispatch} />);

    const exposureSlider = screen.getByLabelText('Exposition');
    const contrastSlider = screen.getByLabelText('Contraste');

    // Change exposure
    fireEvent.change(exposureSlider, { target: { value: '50' } });
    fireEvent.pointerUp(exposureSlider);

    mockDispatch.mockClear();

    // Change contrast
    fireEvent.change(contrastSlider, { target: { value: '25' } });
    fireEvent.pointerUp(contrastSlider);

    // Should commit only contrast changes (new interaction)
    const commitCalls = mockDispatch.mock.calls.filter((call) => call[0] === 'EDIT_COMMIT');
    expect(commitCalls).toHaveLength(1);
    expect(commitCalls[0]).toBeDefined();
    expect(commitCalls[0]![1]).toEqual({ contrast: 25 });
  });
});

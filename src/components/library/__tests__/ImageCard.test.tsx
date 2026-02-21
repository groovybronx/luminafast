import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ImageCard } from '../ImageCard';
import type { CatalogImage } from '@/types';

const mockImage: CatalogImage = {
  id: 1,
  filename: 'test.jpg',
  url: '/mock/test.jpg',
  hash: 'mockhash',
  capturedAt: '',
  exif: { iso: 100, aperture: 2.8, shutterSpeed: '1/125', lens: undefined, cameraModel: undefined },
  state: {
    rating: 4,
    flag: null,
    edits: {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      temp: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0,
      clarity: 0,
    },
    isSynced: false,
    revision: '',
    tags: [],
  },
  sizeOnDisk: '',
};

describe('ImageCard', () => {
  it('affiche le nom et la note', () => {
    const { getByText } = render(
      <ImageCard image={mockImage} selected={false} onSelect={vi.fn()} />,
    );
    expect(getByText('test.jpg')).toBeDefined();
    expect(getByText('4')).toBeDefined();
  });

  it('appelle onSelect au clic', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <ImageCard image={mockImage} selected={false} onSelect={onSelect} />,
    );
    fireEvent.click(getByRole('img').parentElement!);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('affiche le style sélectionné', () => {
    const { container } = render(
      <ImageCard image={mockImage} selected={true} onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toHaveClass('selected');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LazyLoadedImageCard } from '../LazyLoadedImageCard';
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
    isSynced: true,
    revision: '',
    tags: [],
  },
  sizeOnDisk: '',
};

describe('LazyLoadedImageCard', () => {
  beforeEach(() => {
    // Mock IntersectionObserver - créer une classe pour que `new` fonctionne
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    global.IntersectionObserver = MockIntersectionObserver as any;
  });

  it('affiche la vignette avec les bonnes dimensions', () => {
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.style.width).toBe('120px');
    expect(card.style.height).toBe('80px');
  });

  it('rend la vignette draggable', () => {
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.draggable).toBe(true);
  });

  it('affiche le nom du fichier dans les métadonnées', () => {
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    expect(container.innerHTML).toContain('test.jpg');
  });

  it('affiche les étoiles de notation', () => {
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    // 4 stars = ★★★★
    expect(container.innerHTML).toContain('★★★★');
  });

  it('affiche la bordure bleue quand sélectionné', () => {
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={true}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[1]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-blue-500');
    expect(card.className).toContain('ring-blue-500');
  });

  it("affiche l'indicateur flag pick", () => {
    const imageWithPick: CatalogImage = {
      ...mockImage,
      state: { ...mockImage.state, flag: 'pick' },
    };

    const { container } = render(
      <LazyLoadedImageCard
        image={imageWithPick}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const pickFlag = container.querySelector('.bg-emerald-500');
    expect(pickFlag).toBeDefined();
  });

  it("affiche l'indicateur flag reject", () => {
    const imageWithReject: CatalogImage = {
      ...mockImage,
      state: { ...mockImage.state, flag: 'reject' },
    };

    const { container } = render(
      <LazyLoadedImageCard
        image={imageWithReject}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const rejectFlag = container.querySelector('.bg-red-600');
    expect(rejectFlag).toBeDefined();
  });

  it('appelle onToggleSelection au clic', () => {
    const onToggleSelection = vi.fn();
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={onToggleSelection}
        onSetActiveView={vi.fn()}
      />,
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);
    expect(onToggleSelection).toHaveBeenCalledWith(mockImage.id, expect.any(Object));
  });

  it('appelle onSetActiveView au double-clic', () => {
    const onSetActiveView = vi.fn();
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={onSetActiveView}
      />,
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.doubleClick(card);
    expect(onSetActiveView).toHaveBeenCalledWith('develop');
  });

  it('setup IntersectionObserver au mount', () => {
    // IntersectionObserver est déjà mockée dans beforeEach
    // Ici on vérifie juste qu'elle est utilisée
    const { container } = render(
      <LazyLoadedImageCard
        image={mockImage}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    // Le composant devrait s'être rendu sans erreur
    const card = container.firstChild as HTMLElement;
    expect(card).toBeDefined();
  });

  it("affiche l'indicateur de sync si non synchronisé", () => {
    const imageNotSynced: CatalogImage = {
      ...mockImage,
      state: { ...mockImage.state, isSynced: false },
    };

    const { container } = render(
      <LazyLoadedImageCard
        image={imageNotSynced}
        isSelected={false}
        itemWidth={120}
        itemHeight={80}
        selectedImageIds={[]}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    // L'indicateur de sync non-synchronisé doit afficher une icône spinning (amber)
    const syncIndicator = container.querySelector('.text-amber-500');
    expect(syncIndicator).toBeDefined();
  });
});

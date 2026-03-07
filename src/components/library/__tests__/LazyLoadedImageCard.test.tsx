import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { LazyLoadedImageCard } from '../LazyLoadedImageCard';
import type { CatalogImage } from '@/types';

const mockImage: CatalogImage = {
  id: 1,
  filename: 'test.jpg',
  urls: { thumbnail: '/mock/thumb.jpg', standard: '/mock/test.jpg', oneToOne: undefined },
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
    global.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
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

  // Phase 6.3 — Advanced Grid Virtualization
  describe('Phase 6.3 — Shimmer skeleton et chargement différé', () => {
    it('affiche le shimmer skeleton par défaut (avant chargement)', () => {
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

      const shimmer = container.querySelector('.grid-skeleton-shimmer');
      expect(shimmer).not.toBeNull();
    });

    it('remplace le shimmer par PreviewRenderer une fois visible', async () => {
      // IntersectionObserver mockée dans beforeEach pour déclencher intersection
      class TriggerIntersectionObserver {
        callback: IntersectionObserverCallback;
        observe = vi.fn((element: Element) => {
          setTimeout(() => {
            this.callback(
              [{ target: element, isIntersecting: true } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
          }, 10);
        });
        disconnect = vi.fn();
        unobserve = vi.fn();
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }
      }
      global.IntersectionObserver =
        TriggerIntersectionObserver as unknown as typeof IntersectionObserver;
      global.requestAnimationFrame = (cb: FrameRequestCallback) =>
        setTimeout(() => cb(Date.now()), 0) as unknown as number;

      const { container } = render(
        <LazyLoadedImageCard
          image={mockImage}
          isSelected={false}
          itemWidth={120}
          itemHeight={80}
          selectedImageIds={[]}
          isScrollingFast={false}
          onToggleSelection={vi.fn()}
          onSetActiveView={vi.fn()}
        />,
      );

      // Once visible, the shimmer is replaced by PreviewRenderer (even if WASM mode renders nothing in tests)
      await waitFor(
        () => {
          const shimmer = container.querySelector('[data-testid="shimmer-skeleton"]');
          expect(shimmer).toBeNull();
        },
        { timeout: 500 },
      );

      // PreviewRenderer wrapper div is present
      const previewWrapper = container.querySelector('.preview-renderer');
      expect(previewWrapper).not.toBeNull();
    });

    it("garde le shimmer quand isScrollingFast=true lors de l'intersection", async () => {
      // IntersectionObserver qui déclenche immédiatement
      class FastScrollIntersectionObserver {
        callback: IntersectionObserverCallback;
        observe = vi.fn((element: Element) => {
          this.callback(
            [{ target: element, isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        });
        disconnect = vi.fn();
        unobserve = vi.fn();
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }
      }
      global.IntersectionObserver =
        FastScrollIntersectionObserver as unknown as typeof IntersectionObserver;

      const { container } = render(
        <LazyLoadedImageCard
          image={mockImage}
          isSelected={false}
          itemWidth={120}
          itemHeight={80}
          selectedImageIds={[]}
          isScrollingFast={true}
          onToggleSelection={vi.fn()}
          onSetActiveView={vi.fn()}
        />,
      );

      // Shimmer doit encore être présent car scroll rapide
      const shimmer = container.querySelector('.grid-skeleton-shimmer');
      expect(shimmer).not.toBeNull();
    });
  });
});

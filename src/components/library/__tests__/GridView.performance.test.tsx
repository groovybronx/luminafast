import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GridView } from '@/components/library/GridView';
import type { CatalogImage } from '@/types';

vi.mock('@/services/catalogService', () => ({
  CatalogService: {
    getEditEvents: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/wasmRenderingService', () => ({
  loadWasmModule: vi.fn().mockResolvedValue(undefined),
  hasWasmSupport: vi.fn().mockReturnValue(false),
  renderWithWasm: vi.fn(),
}));

vi.mock('@/services/imageDataService', () => ({
  imageDataService: {
    prefetchImageExif: vi.fn(),
  },
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn((config: { count: number; estimateSize: () => number }) => {
    const visibleCount = Math.min(20, config.count);
    const items = Array.from({ length: visibleCount }, (_, index) => ({
      key: index,
      index,
      start: config.estimateSize() * index,
    }));
    return {
      getTotalSize: () => config.estimateSize() * config.count,
      getVirtualItems: () => items,
      measure: vi.fn(),
    };
  }),
}));

const images: CatalogImage[] = Array.from({ length: 5000 }, (_, index) => ({
  id: index + 1,
  hash: `h-${index + 1}`,
  filename: `IMG_${String(index + 1).padStart(4, '0')}.JPG`,
  urls: {
    thumbnail: `/tmp/thumb-${index + 1}.jpg`,
    standard: `/tmp/std-${index + 1}.jpg`,
  },
  capturedAt: '',
  exif: {},
  state: {
    rating: 0,
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
    revision: '1',
    tags: [],
  },
  sizeOnDisk: '0 MB',
}));

describe('GridView performance profile', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 1200,
    });

    global.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  });

  it('renders a bounded subset of cards for 5000 images', () => {
    const { container } = render(
      <GridView
        images={images}
        selection={[]}
        thumbnailSize={5}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const renderedCards = container.querySelectorAll('[draggable="true"]');
    expect(renderedCards.length).toBeLessThan(300);
  });

  it('keeps initial render latency bounded with 5000 images', () => {
    const startedAt = performance.now();

    render(
      <GridView
        images={images}
        selection={[]}
        thumbnailSize={5}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const elapsedMs = performance.now() - startedAt;

    // Proxy metric for smoothness in test harness: first paint under 100ms budget.
    expect(elapsedMs).toBeLessThan(100);
  });

  it('keeps heap growth under 100MB for 5000-image render', () => {
    const beforeHeap = process.memoryUsage().heapUsed;

    render(
      <GridView
        images={images}
        selection={[]}
        thumbnailSize={5}
        onToggleSelection={vi.fn()}
        onSetActiveView={vi.fn()}
      />,
    );

    const afterHeap = process.memoryUsage().heapUsed;
    const heapDeltaMb = (afterHeap - beforeHeap) / (1024 * 1024);

    expect(heapDeltaMb).toBeLessThan(100);
  });
});

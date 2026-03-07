import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BatchBar } from '../BatchBar';

// Mock stores used by BatchBar
vi.mock('@/stores/collectionStore', () => ({
  useCollectionStore: vi.fn(() => ({
    collections: [],
  })),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: vi.fn(() => ({
    selection: new Set([1, 2]),
  })),
}));

vi.mock('@/stores/tagStore', () => ({
  useTagStore: vi.fn(() => ({
    flatTags: [],
    addTagsToImages: vi.fn(),
    createTag: vi.fn(),
    loadTags: vi.fn(),
  })),
}));

import type { EditState } from '@/types';

type DispatchFn = (
  eventType: string,
  payload: number | string | 'pick' | 'reject' | null | Partial<EditState>,
) => void;

const renderBatchBar = (overrides: { selectionCount?: number; onDispatchEvent?: DispatchFn }) => {
  const onDispatchEvent: DispatchFn = overrides.onDispatchEvent ?? vi.fn();
  const onAddLog = vi.fn();
  const onClearSelection = vi.fn();
  return {
    onDispatchEvent,
    onAddLog,
    onClearSelection,
    ...render(
      <BatchBar
        selectionCount={overrides.selectionCount ?? 2}
        onDispatchEvent={onDispatchEvent}
        onAddLog={onAddLog}
        onClearSelection={onClearSelection}
      />,
    ),
  };
};

describe('BatchBar — Phase 5.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne render pas si selectionCount <= 1', () => {
    const { container } = renderBatchBar({ selectionCount: 1 });
    expect(container.firstChild).toBeNull();
  });

  it("affiche le nombre d'assets selectionnés", () => {
    const { getByText } = renderBatchBar({ selectionCount: 3 });
    expect(getByText('3 ASSETS')).toBeDefined();
  });

  describe('Batch flag', () => {
    it('dispatch FLAG pick au clic sur Pick', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Marquer comme pick (P)'));
      expect(onDispatchEvent).toHaveBeenCalledWith('FLAG', 'pick');
    });

    it('dispatch FLAG reject au clic sur Reject', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Marquer comme reject (X)'));
      expect(onDispatchEvent).toHaveBeenCalledWith('FLAG', 'reject');
    });

    it('dispatch FLAG null au clic sur Clear', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Effacer le flag (U)'));
      expect(onDispatchEvent).toHaveBeenCalledWith('FLAG', null);
    });
  });

  describe('Batch rating', () => {
    it('dispatch RATING 1 au clic sur 1 etoile', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Attribuer 1 étoile(s)'));
      expect(onDispatchEvent).toHaveBeenCalledWith('RATING', 1);
    });

    it('dispatch RATING 3 au clic sur 3 etoiles', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Attribuer 3 étoile(s)'));
      expect(onDispatchEvent).toHaveBeenCalledWith('RATING', 3);
    });

    it('dispatch RATING 5 au clic sur 5 etoiles', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Attribuer 5 étoile(s)'));
      expect(onDispatchEvent).toHaveBeenCalledWith('RATING', 5);
    });

    it('dispatch RATING 0 au clic sur Clear rating', () => {
      const onDispatchEvent = vi.fn();
      const { getByLabelText } = renderBatchBar({ onDispatchEvent });
      fireEvent.click(getByLabelText('Effacer la note'));
      expect(onDispatchEvent).toHaveBeenCalledWith('RATING', 0);
    });
  });
});

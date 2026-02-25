import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEditStore } from '../editStore';
import type { EditStateDTO } from '../../types/edit';

// Mock du service editService
vi.mock('@/services/editService', () => ({
  getCurrentEditState: vi.fn(),
  applyEdit: vi.fn(),
  undoEdit: vi.fn(),
  redoEdit: vi.fn(),
  resetEdits: vi.fn(),
  getEditHistory: vi.fn(),
}));

import * as editService from '@/services/editService';

// Fixtures
const mockStateLoaded: EditStateDTO = {
  image_id: 42,
  state: { exposure: 0.5, contrast: -0.2 },
  can_undo: true,
  can_redo: false,
  event_count: 3,
};

const mockStateAfterUndo: EditStateDTO = {
  image_id: 42,
  state: { exposure: 0.3 },
  can_undo: false,
  can_redo: true,
  event_count: 1,
};

const mockStateEmpty: EditStateDTO = {
  image_id: 42,
  state: {},
  can_undo: false,
  can_redo: false,
  event_count: 0,
};

describe('editStore (Phase 4.1 — Event Sourcing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useEditStore.setState({
        selectedImageId: null,
        currentEdits: {},
        canUndo: false,
        canRedo: false,
        eventCount: 0,
        isLoading: false,
        error: null,
      });
    });
  });

  // ─── État initial ──────────────────────────────────────────────────────────

  it('should initialize with correct default state', () => {
    const store = useEditStore.getState();
    expect(store.selectedImageId).toBeNull();
    expect(store.currentEdits).toEqual({});
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
    expect(store.eventCount).toBe(0);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  // ─── setSelectedImageId ───────────────────────────────────────────────────

  it('should update selectedImageId', () => {
    act(() => {
      useEditStore.getState().setSelectedImageId(42);
    });
    expect(useEditStore.getState().selectedImageId).toBe(42);
  });

  it('should allow clearing selectedImageId to null', () => {
    act(() => {
      useEditStore.setState({ selectedImageId: 42 });
      useEditStore.getState().setSelectedImageId(null);
    });
    expect(useEditStore.getState().selectedImageId).toBeNull();
  });

  // ─── loadEditState ────────────────────────────────────────────────────────

  it('should load edit state from backend and update store', async () => {
    vi.mocked(editService.getCurrentEditState).mockResolvedValue(mockStateLoaded);

    await act(async () => {
      await useEditStore.getState().loadEditState(42);
    });

    const store = useEditStore.getState();
    expect(editService.getCurrentEditState).toHaveBeenCalledWith(42);
    expect(store.selectedImageId).toBe(42);
    expect(store.currentEdits).toEqual({ exposure: 0.5, contrast: -0.2 });
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);
    expect(store.eventCount).toBe(3);
    expect(store.isLoading).toBe(false);
  });

  it('should set error when loadEditState fails', async () => {
    vi.mocked(editService.getCurrentEditState).mockRejectedValue(new Error('Backend error'));

    await act(async () => {
      await useEditStore.getState().loadEditState(42);
    });

    expect(useEditStore.getState().error).toBe('Backend error');
    expect(useEditStore.getState().isLoading).toBe(false);
  });

  // ─── applyEdit ────────────────────────────────────────────────────────────

  it('should apply edit when selectedImageId is set', async () => {
    vi.mocked(editService.applyEdit).mockResolvedValue({
      ...mockStateLoaded,
      state: { exposure: 0.7 },
      event_count: 4,
    });
    act(() => useEditStore.setState({ selectedImageId: 42 }));

    await act(async () => {
      await useEditStore.getState().applyEdit('exposure', 0.7);
    });

    expect(editService.applyEdit).toHaveBeenCalledWith(42, 'EXPOSURE', {
      param: 'exposure',
      value: 0.7,
    });
    expect(useEditStore.getState().currentEdits).toEqual({ exposure: 0.7 });
    expect(useEditStore.getState().eventCount).toBe(4);
  });

  it('should not call backend if selectedImageId is null', async () => {
    await act(async () => {
      await useEditStore.getState().applyEdit('exposure', 0.5);
    });
    expect(editService.applyEdit).not.toHaveBeenCalled();
  });

  it('should infer eventType from param name', async () => {
    vi.mocked(editService.applyEdit).mockResolvedValue(mockStateLoaded);
    act(() => useEditStore.setState({ selectedImageId: 1 }));

    await act(async () => {
      await useEditStore.getState().applyEdit('saturation', 0.3);
    });

    expect(editService.applyEdit).toHaveBeenCalledWith(
      1,
      'SATURATION',
      expect.objectContaining({ param: 'saturation', value: 0.3 }),
    );
  });

  // ─── updateEdit (local, sans persistance) ────────────────────────────────

  it('should update currentEdits locally without calling backend', () => {
    act(() => {
      useEditStore.getState().updateEdit('exposure', 0.4);
    });
    expect(useEditStore.getState().currentEdits.exposure).toBe(0.4);
    expect(editService.applyEdit).not.toHaveBeenCalled();
  });

  // ─── undo ─────────────────────────────────────────────────────────────────

  it('should call undoEdit and update store state', async () => {
    vi.mocked(editService.undoEdit).mockResolvedValue(mockStateAfterUndo);
    act(() => useEditStore.setState({ selectedImageId: 42 }));

    await act(async () => {
      await useEditStore.getState().undo();
    });

    expect(editService.undoEdit).toHaveBeenCalledWith(42);
    const store = useEditStore.getState();
    expect(store.currentEdits).toEqual({ exposure: 0.3 });
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);
  });

  it('should not call undoEdit if no image selected', async () => {
    await act(async () => {
      await useEditStore.getState().undo();
    });
    expect(editService.undoEdit).not.toHaveBeenCalled();
  });

  // ─── redo ─────────────────────────────────────────────────────────────────

  it('should call redoEdit with eventId and update state', async () => {
    vi.mocked(editService.redoEdit).mockResolvedValue(mockStateLoaded);
    act(() => useEditStore.setState({ selectedImageId: 42 }));

    await act(async () => {
      await useEditStore.getState().redo(7);
    });

    expect(editService.redoEdit).toHaveBeenCalledWith(42, 7);
    expect(useEditStore.getState().canUndo).toBe(true);
  });

  it('should not call redoEdit if no image selected', async () => {
    await act(async () => {
      await useEditStore.getState().redo(7);
    });
    expect(editService.redoEdit).not.toHaveBeenCalled();
  });

  // ─── resetEdits ───────────────────────────────────────────────────────────

  it('should call resetEdits and clear local state', async () => {
    vi.mocked(editService.resetEdits).mockResolvedValue(undefined);
    act(() =>
      useEditStore.setState({
        selectedImageId: 42,
        currentEdits: { exposure: 0.5 },
        canUndo: true,
        eventCount: 3,
      }),
    );

    await act(async () => {
      await useEditStore.getState().resetEdits();
    });

    expect(editService.resetEdits).toHaveBeenCalledWith(42);
    const store = useEditStore.getState();
    expect(store.currentEdits).toEqual({});
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
    expect(store.eventCount).toBe(0);
  });

  it('should not call resetEdits backend if no image selected', async () => {
    await act(async () => {
      await useEditStore.getState().resetEdits();
    });
    expect(editService.resetEdits).not.toHaveBeenCalled();
  });

  // ─── error handling ───────────────────────────────────────────────────────

  it('should set error string on applyEdit failure', async () => {
    vi.mocked(editService.applyEdit).mockRejectedValue(new Error('DB error'));
    act(() => useEditStore.setState({ selectedImageId: 42 }));

    await act(async () => {
      await useEditStore.getState().applyEdit('exposure', 0.5);
    });

    expect(useEditStore.getState().error).toBe('DB error');
    expect(useEditStore.getState().isLoading).toBe(false);
  });

  // ─── Etat vide après reset avec mockStateEmpty ────────────────────────────

  it('should correctly represent an empty initial DB state', async () => {
    vi.mocked(editService.getCurrentEditState).mockResolvedValue(mockStateEmpty);

    await act(async () => {
      await useEditStore.getState().loadEditState(42);
    });

    const store = useEditStore.getState();
    expect(store.currentEdits).toEqual({});
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
    expect(store.eventCount).toBe(0);
  });
});

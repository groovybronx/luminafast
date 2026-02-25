import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyEdit,
  getEditHistory,
  getCurrentEditState,
  undoEdit,
  redoEdit,
  resetEdits,
} from '@/services/editService';
import type { EditStateDTO, EditEventDTO } from '@/types/edit';

// Mock de l'invoke Tauri via __TAURI_INTERNALS__
const mockInvoke = vi.fn();

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: { invoke: mockInvoke },
  writable: true,
});

// Mock du module @tauri-apps/api/core pour récupérer invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Fixtures
const mockEditState: EditStateDTO = {
  image_id: 42,
  state: { exposure: 0.5, contrast: -0.2 },
  can_undo: true,
  can_redo: false,
  event_count: 2,
};

const mockEvent: EditEventDTO = {
  id: 1,
  event_type: 'EXPOSURE',
  payload: { param: 'exposure', value: 0.5 },
  is_undone: false,
  created_at: '2026-02-25 10:00:00',
};

describe('editService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- applyEdit ---
  describe('applyEdit', () => {
    it('should invoke apply_edit with camelCase params and serialized payload', async () => {
      mockInvoke.mockResolvedValue(mockEditState);

      const result = await applyEdit(42, 'EXPOSURE', { param: 'exposure', value: 0.5 });

      expect(mockInvoke).toHaveBeenCalledWith('apply_edit', {
        imageId: 42,
        eventType: 'EXPOSURE',
        payloadJson: JSON.stringify({ param: 'exposure', value: 0.5 }),
      });
      expect(result).toEqual(mockEditState);
    });

    it('should propagate errors from the backend', async () => {
      mockInvoke.mockRejectedValue(new Error('image not found'));
      await expect(applyEdit(999, 'EXPOSURE', { param: 'exposure', value: 0.5 })).rejects.toThrow(
        'image not found',
      );
    });
  });

  // --- getEditHistory ---
  describe('getEditHistory', () => {
    it('should invoke get_edit_history with imageId', async () => {
      mockInvoke.mockResolvedValue([mockEvent]);

      const result = await getEditHistory(42);

      expect(mockInvoke).toHaveBeenCalledWith('get_edit_history', { imageId: 42 });
      expect(result).toHaveLength(1);
      expect(result[0]?.event_type).toBe('EXPOSURE');
    });

    it('should return empty array for image with no history', async () => {
      mockInvoke.mockResolvedValue([]);
      const result = await getEditHistory(1);
      expect(result).toEqual([]);
    });
  });

  // --- getCurrentEditState ---
  describe('getCurrentEditState', () => {
    it('should invoke get_current_edit_state with imageId', async () => {
      mockInvoke.mockResolvedValue(mockEditState);

      const result = await getCurrentEditState(42);

      expect(mockInvoke).toHaveBeenCalledWith('get_current_edit_state', { imageId: 42 });
      expect(result.event_count).toBe(2);
      expect(result.can_undo).toBe(true);
    });
  });

  // --- undoEdit ---
  describe('undoEdit', () => {
    it('should invoke undo_edit with imageId', async () => {
      const undoneState: EditStateDTO = {
        ...mockEditState,
        state: { exposure: 0.3 },
        can_undo: false,
        can_redo: true,
        event_count: 1,
      };
      mockInvoke.mockResolvedValue(undoneState);

      const result = await undoEdit(42);

      expect(mockInvoke).toHaveBeenCalledWith('undo_edit', { imageId: 42 });
      expect(result.can_redo).toBe(true);
    });
  });

  // --- redoEdit ---
  describe('redoEdit', () => {
    it('should invoke redo_edit with imageId and eventId', async () => {
      mockInvoke.mockResolvedValue(mockEditState);

      const result = await redoEdit(42, 7);

      expect(mockInvoke).toHaveBeenCalledWith('redo_edit', { imageId: 42, eventId: 7 });
      expect(result).toEqual(mockEditState);
    });
  });

  // --- resetEdits ---
  describe('resetEdits', () => {
    it('should invoke reset_edits with imageId', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await resetEdits(42);

      expect(mockInvoke).toHaveBeenCalledWith('reset_edits', { imageId: 42 });
    });

    it('should resolve without return value', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await expect(resetEdits(42)).resolves.toBeUndefined();
    });
  });
});

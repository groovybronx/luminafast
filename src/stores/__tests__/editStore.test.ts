import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEditStore } from '../editStore';
import type { CatalogEvent } from '../../types';
import type { EventDTO } from '@/services/eventService';

describe('editStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useEditStore.setState({
        eventLog: [],
        currentEdits: {},
        historyIndex: -1,
        editEventsByImage: {},
      });
    });
  });

  it('should initialize with empty state', () => {
    const store = useEditStore.getState();
    expect(store.eventLog).toEqual([]);
    expect(store.currentEdits).toEqual({});
    expect(store.historyIndex).toBe(-1);
    expect(store.editEventsByImage).toEqual({});
  });

  it('should add events to log', () => {
    const mockEvent: CatalogEvent = {
      id: 'test-event-1',
      timestamp: Date.now(),
      type: 'RATING',
      payload: { type: 'RATING', value: 5 },
      targets: [1],
    };

    act(() => {
      useEditStore.getState().addEvent(mockEvent);
    });

    expect(useEditStore.getState().eventLog).toHaveLength(1);
    expect(useEditStore.getState().eventLog[0]).toEqual(mockEvent);
  });

  it('should add multiple events in chronological order', () => {
    const event1: CatalogEvent = {
      id: 'test-event-1',
      timestamp: 1000,
      type: 'RATING',
      payload: { type: 'RATING', value: 3 },
      targets: [1],
    };

    const event2: CatalogEvent = {
      id: 'test-event-2',
      timestamp: 2000,
      type: 'FLAG',
      payload: { type: 'FLAG', value: 'pick' },
      targets: [1],
    };

    act(() => {
      useEditStore.getState().addEvent(event1);
      useEditStore.getState().addEvent(event2);
    });

    expect(useEditStore.getState().eventLog).toHaveLength(2);
    expect(useEditStore.getState().eventLog[0]).toEqual(event2); // Most recent first
    expect(useEditStore.getState().eventLog[1]).toEqual(event1);
  });

  it('should set current edits', () => {
    const edits = {
      exposure: 0.5,
      contrast: -0.2,
      saturation: 0.3,
    };

    act(() => {
      useEditStore.getState().setCurrentEdits(edits);
    });

    expect(useEditStore.getState().currentEdits).toEqual(edits);
    expect(Object.keys(useEditStore.getState().currentEdits)).toHaveLength(3);
  });

  it('should update individual edit parameter', () => {
    // Set initial edits
    act(() => {
      useEditStore.getState().setCurrentEdits({ exposure: 0.5, contrast: -0.2 });
    });

    // Update one parameter
    act(() => {
      useEditStore.getState().updateEdit('exposure', 0.8);
    });

    expect(useEditStore.getState().currentEdits.exposure).toBe(0.8);
    expect(useEditStore.getState().currentEdits.contrast).toBe(-0.2); // Unchanged

    // Add new parameter
    act(() => {
      useEditStore.getState().updateEdit('saturation', 0.3);
    });

    expect(useEditStore.getState().currentEdits.saturation).toBe(0.3);
    expect(useEditStore.getState().currentEdits).toEqual({
      exposure: 0.8,
      contrast: -0.2,
      saturation: 0.3,
    });
  });

  it('should reset edits', () => {
    act(() => {
      useEditStore.getState().setCurrentEdits({
        exposure: 0.5,
        contrast: -0.2,
        saturation: 0.3,
      });
    });

    expect(Object.keys(useEditStore.getState().currentEdits)).toHaveLength(3);

    act(() => {
      useEditStore.getState().resetEdits();
    });

    expect(useEditStore.getState().currentEdits).toEqual({});
  });

  it('should handle undo and redo placeholders', () => {
    // These are placeholders for now, but should not crash
    expect(() => useEditStore.getState().undo()).not.toThrow();
    expect(() => useEditStore.getState().redo()).not.toThrow();

    // Getters should work
    expect(typeof useEditStore.getState().canUndo()).toBe('boolean');
    expect(typeof useEditStore.getState().canRedo()).toBe('boolean');
  });

  it('should track undo/redo capability based on history index', () => {
    // Initially should not be able to undo or redo
    expect(useEditStore.getState().canUndo()).toBe(false);
    expect(useEditStore.getState().canRedo()).toBe(false);

    // Add events to history (simulated)
    act(() => {
      useEditStore.getState().addEvent({
        id: 'test-1',
        timestamp: Date.now(),
        type: 'RATING',
        payload: { type: 'RATING', value: 5 },
        targets: [1],
      });
    });

    // History index logic will be implemented in Phase 4.1
    // For now, just ensure the getters don't crash
    expect(typeof useEditStore.getState().canUndo()).toBe('boolean');
    expect(typeof useEditStore.getState().canRedo()).toBe('boolean');
  });

  it('should handle complex edit scenarios', () => {
    // Start with some edits
    act(() => {
      useEditStore.getState().setCurrentEdits({ exposure: 0.0 });

      // Add events while editing
      useEditStore.getState().addEvent({
        id: 'edit-1',
        timestamp: Date.now(),
        type: 'EDIT',
        payload: { type: 'EDIT', value: { exposure: 0.2 } },
        targets: [1],
      });

      // Update edits
      useEditStore.getState().updateEdit('exposure', 0.3);
      useEditStore.getState().updateEdit('contrast', 0.1);

      // Add another event
      useEditStore.getState().addEvent({
        id: 'edit-2',
        timestamp: Date.now(),
        type: 'EDIT',
        payload: { type: 'EDIT', value: { exposure: 0.3, contrast: 0.1 } },
        targets: [1],
      });
    });

    // Verify state
    expect(useEditStore.getState().eventLog).toHaveLength(2);
    expect(useEditStore.getState().currentEdits).toEqual({
      exposure: 0.3,
      contrast: 0.1,
    });

    // Reset and verify
    act(() => {
      useEditStore.getState().resetEdits();
    });
    expect(useEditStore.getState().currentEdits).toEqual({});
    expect(useEditStore.getState().eventLog).toHaveLength(2); // Events remain in log
  });

  it('should compute applied edits from edit events', () => {
    const events: EventDTO[] = [
      {
        id: 'evt-1',
        timestamp: 123,
        eventType: 'ImageEdited',
        payload: {
          edits: { exposure: 0.5, saturation: 1.2 },
        },
        targetType: 'Image',
        targetId: 1,
        userId: undefined,
        createdAt: new Date().toISOString(),
      },
    ];

    useEditStore.getState().setEditEvents(1, events);

    const filters = useEditStore.getState().getAppliedEdits(1);
    expect(filters.exposure).toBe(0.5);
    expect(filters.saturation).toBe(1.2);
  });
});

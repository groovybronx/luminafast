import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEditStore } from '../editStore';
import type { CatalogEvent } from '../../types';
import type { EventDTO } from '@/services/eventService';
import type { SnapshotDTO } from '@/services/snapshotService';

describe('editStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useEditStore.setState({
        eventLog: [],
        currentEdits: {},
        historyIndex: -1,
      });
    });
  });

  it('should initialize with empty state', () => {
    const store = useEditStore.getState();
    expect(store.eventLog).toEqual([]);
    expect(store.currentEdits).toEqual({});
    expect(store.historyIndex).toBe(-1);
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

  describe('snapshot actions', () => {
    it('should initialize snapshots as empty object', () => {
      const store = useEditStore.getState();
      expect(store.snapshots).toEqual({});
    });

    it('should restore to event by slicing event array', () => {
      const imageId = 100;
      const events: EventDTO[] = [
        {
          id: 'evt-3',
          timestamp: 3000,
          eventType: 'saturation',
          targetType: 'image' as const,
          targetId: imageId,
          payload: { value: 0.3 },
          createdAt: '2025-03-02T12:02:00Z',
        },
        {
          id: 'evt-2',
          timestamp: 2000,
          eventType: 'exposure',
          targetType: 'image' as const,
          targetId: imageId,
          payload: { value: 0.2 },
          createdAt: '2025-03-02T12:01:00Z',
        },
        {
          id: 'evt-1',
          timestamp: 1000,
          eventType: 'contrast',
          targetType: 'image' as const,
          targetId: imageId,
          payload: { value: 0.1 },
          createdAt: '2025-03-02T12:00:00Z',
        },
      ];

      // Setup events for image
      act(() => {
        useEditStore.getState().setEditEventsForImage(imageId, events);
      });

      // Restore to middle event (eventIndex = 1)
      act(() => {
        useEditStore.getState().restoreToEvent(imageId, 1);
      });

      const restored = useEditStore.getState().editEventsPerImage[imageId];
      expect(restored).toHaveLength(2);
      expect(restored?.[0]).toEqual(events[0]);
      expect(restored?.[1]).toEqual(events[1]);
    });

    it('should not change events when restoring to invalid eventIndex', () => {
      const imageId = 100;
      const events: EventDTO[] = [
        {
          id: 'evt-1',
          timestamp: 1000,
          eventType: 'exposure',
          targetType: 'image' as const,
          targetId: imageId,
          payload: { value: 0.5 },
          createdAt: '2025-03-02T12:00:00Z',
        },
      ];

      act(() => {
        useEditStore.getState().setEditEventsForImage(imageId, events);
      });

      // Restore to out-of-bounds index should not change state
      act(() => {
        useEditStore.getState().restoreToEvent(imageId, 999);
      });

      const restored = useEditStore.getState().editEventsPerImage[imageId];
      expect(restored).toEqual(events); // Should remain unchanged
    });

    it('should set snapshots for an image', () => {
      const imageId = 100;
      const mockSnapshots: SnapshotDTO[] = [
        {
          id: 1,
          imageId,
          name: 'Snapshot 1',
          snapshotData: '[]',
          eventIds: [],
          createdAt: '2025-03-02T12:00:00Z',
        },
        {
          id: 2,
          imageId,
          name: 'Snapshot 2',
          snapshotData: '[]',
          eventIds: [],
          createdAt: '2025-03-02T12:01:00Z',
        },
      ];

      act(() => {
        useEditStore.getState().setSnapshots(imageId, mockSnapshots);
      });

      expect(useEditStore.getState().snapshots[imageId]).toEqual(mockSnapshots);
    });

    it('should add snapshot to list', () => {
      const imageId = 100;
      const snapshot1: SnapshotDTO = {
        id: 1,
        imageId,
        name: 'First snapshot',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      };

      const snapshot2: SnapshotDTO = {
        id: 2,
        imageId,
        name: 'Second snapshot',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:01:00Z',
      };

      act(() => {
        useEditStore.getState().setSnapshots(imageId, [snapshot1]);
        useEditStore.getState().addSnapshot(imageId, snapshot2);
      });

      const snapshots = useEditStore.getState().snapshots[imageId];
      expect(snapshots).toHaveLength(2);
      expect(snapshots?.[0]).toEqual(snapshot2); // Most recently added first
      expect(snapshots?.[1]).toEqual(snapshot1);
    });

    it('should delete snapshot locally', () => {
      const imageId = 100;
      const snapshot1: SnapshotDTO = {
        id: 1,
        imageId,
        name: 'Snapshot 1',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      };

      const snapshot2: SnapshotDTO = {
        id: 2,
        imageId,
        name: 'Snapshot 2',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:01:00Z',
      };

      act(() => {
        useEditStore.getState().setSnapshots(imageId, [snapshot1, snapshot2]);
        useEditStore.getState().deleteSnapshotLocal(imageId, 1);
      });

      const snapshots = useEditStore.getState().snapshots[imageId];
      expect(snapshots).toHaveLength(1);
      expect(snapshots?.[0]).toEqual(snapshot2);
    });

    it('should get snapshots for an image', () => {
      const imageId = 100;
      const mockSnapshots: SnapshotDTO[] = [
        {
          id: 1,
          imageId,
          name: 'Snapshot',
          snapshotData: '[]',
          eventIds: [],
          createdAt: '2025-03-02T12:00:00Z',
        },
      ];

      act(() => {
        useEditStore.getState().setSnapshots(imageId, mockSnapshots);
      });

      const retrieved = useEditStore.getState().getSnapshots(imageId);
      expect(retrieved).toEqual(mockSnapshots);
    });

    it('should return empty array for image with no snapshots', () => {
      const retrieved = useEditStore.getState().getSnapshots(999);
      expect(retrieved).toEqual([]);
    });

    it('should get specific snapshot by id', () => {
      const imageId = 100;
      const snapshot: SnapshotDTO = {
        id: 1,
        imageId,
        name: 'Target snapshot',
        snapshotData: '[]',
        eventIds: [],
        createdAt: '2025-03-02T12:00:00Z',
      };

      act(() => {
        useEditStore.getState().setSnapshots(imageId, [snapshot]);
      });

      const retrieved = useEditStore.getState().getSnapshot(imageId, 1);
      expect(retrieved).toEqual(snapshot);
    });

    it('should return undefined for non-existent snapshot', () => {
      const imageId = 100;

      const retrieved = useEditStore.getState().getSnapshot(imageId, 999);
      expect(retrieved).toBeUndefined();
    });
  });
});

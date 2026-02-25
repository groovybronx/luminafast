import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tauri from '@tauri-apps/api/core';
import { appendEvent, getEvents, replayEvents, type EventDTO } from '../eventService';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(tauri.invoke);

describe('eventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('appendEvent', () => {
    it('should invoke append_event command with event data', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const event: EventDTO = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 1708873200000,
        eventType: 'RatingChanged',
        payload: {
          imageId: 123,
          oldRating: 3,
          newRating: 4,
        },
        targetType: 'Image',
        targetId: 123,
        userId: 'user-1',
        createdAt: '2024-02-25T10:00:00Z',
      };

      await appendEvent(event);

      expect(mockInvoke).toHaveBeenCalledWith('append_event', { event });
    });

    it('should throw error when Tauri command fails', async () => {
      const error = new Error('DB lock failed');
      mockInvoke.mockRejectedValue(error);

      const event: EventDTO = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 1708873200000,
        eventType: 'RatingChanged',
        payload: { imageId: 123, oldRating: 3, newRating: 4 },
        targetType: 'Image',
        targetId: 123,
        createdAt: '2024-02-25T10:00:00Z',
      };

      await expect(appendEvent(event)).rejects.toThrow('Failed to append event: DB lock failed');
    });

    it('should handle error without message property', async () => {
      mockInvoke.mockRejectedValue('Unknown error');

      const event: EventDTO = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 1708873200000,
        eventType: 'RatingChanged',
        payload: { imageId: 123, oldRating: 3, newRating: 4 },
        targetType: 'Image',
        targetId: 123,
        createdAt: '2024-02-25T10:00:00Z',
      };

      await expect(appendEvent(event)).rejects.toThrow('Failed to append event: Unknown error');
    });
  });

  describe('getEvents', () => {
    it('should retrieve all events from store', async () => {
      const mockEvents: EventDTO[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: 1708873200000,
          eventType: 'ImageAdded',
          payload: { imageId: 100, filename: 'photo.jpg', fileHash: 'abc123' },
          targetType: 'Image',
          targetId: 100,
          createdAt: '2024-02-25T10:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: 1708873300000,
          eventType: 'RatingChanged',
          payload: { imageId: 100, oldRating: 0, newRating: 5 },
          targetType: 'Image',
          targetId: 100,
          userId: 'user-1',
          createdAt: '2024-02-25T10:01:40Z',
        },
      ];

      mockInvoke.mockResolvedValue(mockEvents);

      const events = await getEvents();

      expect(mockInvoke).toHaveBeenCalledWith('get_events');
      expect(events).toEqual(mockEvents);
      expect(events.length).toBe(2);
    });

    it('should return empty array if no events exist', async () => {
      mockInvoke.mockResolvedValue([]);

      const events = await getEvents();

      expect(mockInvoke).toHaveBeenCalledWith('get_events');
      expect(events).toEqual([]);
      expect(events.length).toBe(0);
    });

    it('should throw error when Tauri command fails', async () => {
      const error = new Error('Database connection lost');
      mockInvoke.mockRejectedValue(error);

      await expect(getEvents()).rejects.toThrow(
        'Failed to retrieve events: Database connection lost',
      );
    });

    it('should preserve event order (timestamp ascending)', async () => {
      const mockEvents: EventDTO[] = [
        {
          id: '1',
          timestamp: 100,
          eventType: 'ImageAdded',
          payload: {},
          targetType: 'Image',
          targetId: 1,
          createdAt: '2024-02-25T10:00:00Z',
        },
        {
          id: '2',
          timestamp: 200,
          eventType: 'RatingChanged',
          payload: {},
          targetType: 'Image',
          targetId: 1,
          createdAt: '2024-02-25T10:00:10Z',
        },
        {
          id: '3',
          timestamp: 300,
          eventType: 'FlagChanged',
          payload: {},
          targetType: 'Image',
          targetId: 1,
          createdAt: '2024-02-25T10:00:20Z',
        },
      ];

      mockInvoke.mockResolvedValue(mockEvents);

      const events = await getEvents();

      expect(events[0]!.timestamp).toBeLessThan(events[1]!.timestamp);
      expect(events[1]!.timestamp).toBeLessThan(events[2]!.timestamp);
    });
  });

  describe('replayEvents', () => {
    it('should invoke replay_events command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await replayEvents();

      expect(mockInvoke).toHaveBeenCalledWith('replay_events');
    });

    it('should throw error when Tauri command fails', async () => {
      const error = new Error('Replay logic error');
      mockInvoke.mockRejectedValue(error);

      await expect(replayEvents()).rejects.toThrow('Failed to replay events: Replay logic error');
    });

    it('should handle idempotent replay', async () => {
      mockInvoke.mockResolvedValue(undefined);

      // Call replay_events multiple times
      await replayEvents();
      await replayEvents();
      await replayEvents();

      // Should be called 3 times (idempotent, no side effects)
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(mockInvoke).toHaveBeenCalledWith('replay_events');
    });
  });

  describe('integration-like scenarios', () => {
    it('should handle typical workflow: append -> get -> replay', async () => {
      // Setup mocks for sequence
      const newEvent: EventDTO = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 1708873200000,
        eventType: 'RatingChanged',
        payload: { imageId: 123, oldRating: 3, newRating: 4 },
        targetType: 'Image',
        targetId: 123,
        createdAt: '2024-02-25T10:00:00Z',
      };

      mockInvoke
        .mockResolvedValueOnce(undefined) // append_event
        .mockResolvedValueOnce([newEvent]) // get_events
        .mockResolvedValueOnce(undefined); // replay_events

      // Append event
      await appendEvent(newEvent);
      expect(mockInvoke).toHaveBeenCalledWith('append_event', { event: newEvent });

      // Get events
      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('RatingChanged');

      // Replay events
      await replayEvents();
      expect(mockInvoke).toHaveBeenCalledWith('replay_events');

      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple events appended sequentially', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const events: EventDTO[] = [
        {
          id: '1',
          timestamp: 1000,
          eventType: 'ImageAdded',
          payload: { imageId: 1 },
          targetType: 'Image',
          targetId: 1,
          createdAt: '2024-02-25T10:00:00Z',
        },
        {
          id: '2',
          timestamp: 2000,
          eventType: 'RatingChanged',
          payload: { imageId: 1, newRating: 5 },
          targetType: 'Image',
          targetId: 1,
          createdAt: '2024-02-25T10:00:10Z',
        },
        {
          id: '3',
          timestamp: 3000,
          eventType: 'CollectionCreated',
          payload: { collectionId: 10 },
          targetType: 'Collection',
          targetId: 10,
          createdAt: '2024-02-25T10:00:20Z',
        },
      ];

      for (const event of events) {
        await appendEvent(event);
      }

      expect(mockInvoke).toHaveBeenCalledTimes(3);
      events.forEach((event, index) => {
        expect(mockInvoke).toHaveBeenNthCalledWith(index + 1, 'append_event', { event });
      });
    });
  });
});

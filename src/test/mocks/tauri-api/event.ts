import { vi } from 'vitest';

/**
 * Mock for @tauri-apps/api/event module
 * Used in tests to avoid depending on actual Tauri event system
 */

// Mock listen function
export const listen = vi
  .fn()
  .mockImplementation((event: string, _callback?: (payload: unknown) => void) => {
    console.warn(`[Mock] listen called for event: ${event}`);
    // Return a mock unlisten function
    return Promise.resolve(() => {
      console.warn(`[Mock] unlisten called for event: ${event}`);
    });
  });

// Mock unlisten function (if needed directly)
export const unlisten = vi.fn().mockImplementation((listenerId: number) => {
  console.warn(`[Mock] unlisten called with ID: ${listenerId}`);
  return Promise.resolve();
});

// Mock TauriEvent type (if needed)
export interface TauriEvent<T = unknown> {
  event: string;
  payload: T;
}

import { vi } from 'vitest';

/**
 * Mock for @tauri-apps/api/core module
 * Used in tests to avoid importing actual Tauri core functions
 */

// Mock invoke function
export const invoke = vi.fn().mockImplementation((cmd: string, args?: unknown) => {
  console.warn(`[Mock] invoke called: ${cmd}`, args);
  return Promise.resolve(null);
});

// Mock convertFileSrc function
export const convertFileSrc = vi.fn().mockImplementation((path: string, protocol = 'asset') => {
  return `${protocol}://localhost/${path}`;
});

// Mock transformCallback function (if needed)
export const transformCallback = vi.fn().mockImplementation((callback?: (response: unknown) => void) => {
  return callback;
});

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri event API (unique, compatible hook)
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() =>
    Promise.resolve(() => {
      /* cleanup mock */
    }),
  ),
  emit: vi.fn(),
}));

// Mock Tauri dialog API
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(() => Promise.resolve('/mock/path')),
}));

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

(globalThis as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

// Mock window.__TAURI_INTERNALS__ for services that use it directly
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: vi.fn(),
  },
  writable: true,
});

// Mock Tauri window API
vi.mock('@tauri-apps/api/window', () => ({
  getCurrent: vi.fn(() => ({
    label: 'LuminaFast',
    version: '1.0.0',
  })),
}));

// Mock Tauri path API
vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(() => Promise.resolve('/Users/test')),
  appLocalDataDir: vi.fn(() => Promise.resolve('/Users/test')),
  resolveResource: vi.fn(),
  join: vi.fn((...paths) => paths.join('/')),
}));

// Mock Tauri dialog API
vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  ask: vi.fn(),
  confirm: vi.fn(),
  message: vi.fn(),
}));

// Mock Tauri shell API
vi.mock('@tauri-apps/api/shell', () => ({
  open: vi.fn(),
  command: vi.fn(),
}));

// Mock Tauri fs API
vi.mock('@tauri-apps/api/fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  createDir: vi.fn(),
  remove: vi.fn(),
  copyFile: vi.fn(),
  rename: vi.fn(),
}));

// Mock Tauri notification API
vi.mock('@tauri-apps/api/notification', () => ({
  requestPermission: vi.fn(),
  requestPermissions: vi.fn(),
  isPermissionGranted: vi.fn(),
  send: vi.fn(),
}));

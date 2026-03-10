import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppShortcuts } from '@/hooks/useAppShortcuts';
import type { AppShortcut } from '@/types/shortcuts';

describe('useAppShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers shortcut action when key matches', () => {
    const action = vi.fn();
    const shortcuts: AppShortcut[] = [{ key: 'g', action }];

    renderHook(() => useAppShortcuts(shortcuts));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcut when focus is in input', () => {
    const action = vi.fn();
    const shortcuts: AppShortcut[] = [{ key: 'g', action }];

    renderHook(() => useAppShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));

    expect(action).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('respects modifier keys', () => {
    const action = vi.fn();
    const shortcuts: AppShortcut[] = [{ key: 'k', ctrlKey: true, action }];

    renderHook(() => useAppShortcuts(shortcuts));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(action).toHaveBeenCalledTimes(1);
  });
});

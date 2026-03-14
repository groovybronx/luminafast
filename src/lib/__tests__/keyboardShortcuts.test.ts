import { describe, expect, it } from 'vitest';
import { getDefaultShortcutForCommand, parseShortcutCombo } from '../keyboardShortcuts';

describe('parseShortcutCombo', () => {
  it('parse Cmd+I', () => {
    expect(parseShortcutCombo('Cmd+I')).toEqual({
      key: 'i',
      metaKey: true,
    });
  });

  it('parse Ctrl+Shift+E', () => {
    expect(parseShortcutCombo('Ctrl+Shift+E')).toEqual({
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
    });
  });

  it('parse Cmd+,', () => {
    expect(parseShortcutCombo('Cmd+,')).toEqual({
      key: ',',
      metaKey: true,
    });
  });

  it('support aliases for keys', () => {
    expect(parseShortcutCombo('Ctrl+Escape')).toEqual({
      key: 'escape',
      ctrlKey: true,
    });
  });

  it('returns null for invalid combo', () => {
    expect(parseShortcutCombo('')).toBeNull();
    expect(parseShortcutCombo('Ctrl+Shift')).toBeNull();
  });

  it('uses Cmd+, fallback for settings on macOS', () => {
    expect(getDefaultShortcutForCommand('settings', 'MacIntel')).toBe('Cmd+,');
  });

  it('uses Ctrl+, fallback for settings on Windows/Linux', () => {
    expect(getDefaultShortcutForCommand('settings', 'Win32')).toBe('Ctrl+,');
    expect(getDefaultShortcutForCommand('settings', 'Linux x86_64')).toBe('Ctrl+,');
  });
});

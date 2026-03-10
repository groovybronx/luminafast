import { useEffect } from 'react';
import type { AppShortcut } from '@/types/shortcuts';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  );
}

function matchesShortcut(shortcut: AppShortcut, event: KeyboardEvent): boolean {
  const normalizedKey = event.key.toLowerCase();
  if (normalizedKey !== shortcut.key.toLowerCase()) {
    return false;
  }

  return (
    (shortcut.ctrlKey ?? false) === event.ctrlKey &&
    (shortcut.shiftKey ?? false) === event.shiftKey &&
    (shortcut.altKey ?? false) === event.altKey &&
    (shortcut.metaKey ?? false) === event.metaKey
  );
}

export function useAppShortcuts(shortcuts: AppShortcut[], enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const matchingShortcut = shortcuts.find((shortcut) => matchesShortcut(shortcut, event));
      if (!matchingShortcut) {
        return;
      }

      event.preventDefault();
      matchingShortcut.action();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcuts]);
}

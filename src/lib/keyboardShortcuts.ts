import type { AppShortcut } from '@/types/shortcuts';

export type KeyboardShortcutCommand = 'import' | 'library' | 'develop' | 'settings' | 'export';

export type KeyboardShortcutProfile = Record<KeyboardShortcutCommand, string>;

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcutProfile = {
  import: 'Cmd+I',
  library: 'G',
  develop: 'D',
  settings: 'Cmd+,',
  export: 'Cmd+Shift+E',
};

export const LIGHTROOM_KEYBOARD_SHORTCUTS: KeyboardShortcutProfile = {
  import: 'Cmd+Shift+I',
  library: 'G',
  develop: 'D',
  settings: 'Cmd+,',
  export: 'Cmd+Shift+E',
};

function isMacLikePlatform(platformName: string): boolean {
  return /(mac|iphone|ipad|ipod)/i.test(platformName);
}

function getRuntimePlatform(platform?: string): string {
  if (platform) {
    return platform;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.platform === 'string') {
    return navigator.platform;
  }

  return '';
}

export function getDefaultShortcutForCommand(
  command: KeyboardShortcutCommand,
  platform?: string,
): string {
  if (command === 'settings') {
    return isMacLikePlatform(getRuntimePlatform(platform)) ? 'Cmd+,' : 'Ctrl+,';
  }

  return DEFAULT_KEYBOARD_SHORTCUTS[command];
}

export function getDefaultKeyboardShortcuts(platform?: string): KeyboardShortcutProfile {
  return {
    ...DEFAULT_KEYBOARD_SHORTCUTS,
    settings: getDefaultShortcutForCommand('settings', platform),
  };
}

export function getLightroomKeyboardShortcuts(platform?: string): KeyboardShortcutProfile {
  return {
    ...LIGHTROOM_KEYBOARD_SHORTCUTS,
    settings: getDefaultShortcutForCommand('settings', platform),
  };
}

type ShortcutBinding = Omit<AppShortcut, 'action' | 'description'>;

type ModifierKey = 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey';

const MODIFIER_ALIASES: Record<string, ModifierKey> = {
  ctrl: 'ctrlKey',
  control: 'ctrlKey',
  shift: 'shiftKey',
  alt: 'altKey',
  option: 'altKey',
  cmd: 'metaKey',
  command: 'metaKey',
  meta: 'metaKey',
};

const KEY_ALIASES: Record<string, string> = {
  comma: ',',
  period: '.',
  dot: '.',
  slash: '/',
  backslash: '\\',
  space: ' ',
  esc: 'escape',
  escape: 'escape',
  enter: 'enter',
  return: 'enter',
  tab: 'tab',
};

function normalizeShortcutKey(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (MODIFIER_ALIASES[lower]) {
    return null;
  }

  if (KEY_ALIASES[lower]) {
    return KEY_ALIASES[lower];
  }

  if (trimmed.length === 1) {
    return lower;
  }

  return lower;
}

export function parseShortcutCombo(combo: string): ShortcutBinding | null {
  if (!combo || !combo.trim()) {
    return null;
  }

  const tokens = combo
    .split('+')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return null;
  }

  const modifiers: Record<ModifierKey, boolean> = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };

  let keyToken: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const modifier = MODIFIER_ALIASES[lower];

    if (modifier) {
      modifiers[modifier] = true;
      continue;
    }

    keyToken = token;
  }

  if (!keyToken) {
    return null;
  }

  const key = normalizeShortcutKey(keyToken);
  if (!key) {
    return null;
  }

  const binding: ShortcutBinding = { key };

  if (modifiers.ctrlKey) binding.ctrlKey = true;
  if (modifiers.shiftKey) binding.shiftKey = true;
  if (modifiers.altKey) binding.altKey = true;
  if (modifiers.metaKey) binding.metaKey = true;

  return binding;
}

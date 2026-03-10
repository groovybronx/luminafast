export interface AppShortcut {
  key: string;
  action: () => void;
  description?: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

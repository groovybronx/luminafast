const SHORTCUT_KEYS = ['G', 'D', 'P', 'X', '1-5'] as const;

export const KeyboardOverlay = () => (
  <div className="fixed bottom-4 left-4 flex gap-2 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
    {SHORTCUT_KEYS.map((k) => (
      <span
        key={k}
        className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-mono text-zinc-500"
      >
        {k}
      </span>
    ))}
  </div>
);

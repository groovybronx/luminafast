import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface NewCollectionInputProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NewCollectionInput({ onConfirm, onCancel }: NewCollectionInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && value.trim()) {
      onConfirm(value.trim());
      return;
    }

    if (event.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 text-[11px] bg-zinc-800 text-zinc-200 rounded px-2 py-1 outline-none border border-zinc-600 min-w-0"
        placeholder="Nom de la collection..."
        maxLength={80}
      />
      <button
        onClick={() => {
          if (value.trim()) {
            onConfirm(value.trim());
          }
        }}
        disabled={!value.trim()}
        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 transition-colors"
        aria-label="Valider"
      >
        <Check size={12} />
      </button>
      <button
        onClick={onCancel}
        className="text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Annuler"
      >
        <X size={12} />
      </button>
    </div>
  );
}

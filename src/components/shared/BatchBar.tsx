import { Check, Star, Tag, RefreshCw, X } from 'lucide-react';
import type { EditState } from '../../types';

interface BatchBarProps {
  selectionCount: number;
  onDispatchEvent: (eventType: string, payload: number | string | 'pick' | 'reject' | null | Partial<EditState>) => void;
  onAddLog: (message: string, type?: string) => void;
  onClearSelection: () => void;
}

export const BatchBar = ({ selectionCount, onDispatchEvent, onClearSelection }: BatchBarProps) => {
  if (selectionCount <= 1) return null;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/95 border border-blue-500/50 rounded-full px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-8 z-60 animate-in slide-in-from-bottom-6 duration-300">
      <div className="flex flex-col">
        <span className="text-[12px] font-black text-blue-400 uppercase tracking-widest">{selectionCount} ASSETS</span>
        <span className="text-[9px] text-zinc-600 font-mono uppercase">Batch Processing</span>
      </div>
      <div className="w-px h-8 bg-zinc-800"></div>
      <div className="flex gap-6">
        <button onClick={() => onDispatchEvent('FLAG', 'pick')} className="text-zinc-400 hover:text-emerald-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Check size={18}/> Pick</button>
        <button onClick={() => onDispatchEvent('RATING', 5)} className="text-zinc-400 hover:text-amber-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Star size={18}/> Favoris</button>
        <button disabled title="Non implémenté" className="opacity-40 cursor-not-allowed flex flex-col items-center gap-1 text-[9px] font-bold uppercase text-zinc-600"><Tag size={18}/> Tags</button>
        <button disabled title="Non implémenté" className="opacity-40 cursor-not-allowed flex flex-col items-center gap-1 text-[9px] font-bold uppercase text-zinc-600"><RefreshCw size={18}/> Sync</button>
      </div>
      <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full cursor-pointer text-zinc-500 hover:text-white transition-colors" onClick={onClearSelection}>
        <X size={16} />
      </div>
    </div>
  );
};

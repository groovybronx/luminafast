import { Cloud, Settings } from 'lucide-react';
import type { ActiveView } from '../../types';

interface TopNavProps {
  activeView: ActiveView;
  onSetActiveView: (view: ActiveView) => void;
}

export const TopNav = ({ activeView, onSetActiveView }: TopNavProps) => (
  <div className="h-9 bg-black border-b border-zinc-900 flex items-center px-4 justify-between shrink-0 z-50">
    <div className="flex gap-6 items-center">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-black text-[10px] text-white">L</div>
        <span className="text-zinc-100 font-black tracking-tighter text-xs">LUMINA CORE</span>
      </div>
      <nav className="flex gap-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
        <span onClick={() => onSetActiveView('library')} className={`cursor-pointer hover:text-white transition-colors ${activeView==='library'?'text-blue-500 underline underline-offset-8':''}`}>Bibliothèque</span>
        <span onClick={() => onSetActiveView('develop')} className={`cursor-pointer hover:text-white transition-colors ${activeView==='develop'?'text-blue-500 underline underline-offset-8':''}`}>Développement</span>
        <span className="opacity-25">Cartes</span>
        <span className="opacity-25">Impression</span>
      </nav>
    </div>
    <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
       <div className="flex items-center gap-2"><Cloud size={12} className="text-green-500"/> SQLite</div>
       <div className="w-px h-3 bg-zinc-800"></div>
       <div className="flex items-center gap-2"><Settings size={12}/> V1.7.2-BETA</div>
    </div>
  </div>
);

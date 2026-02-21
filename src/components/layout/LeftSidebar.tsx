import { Database, Star, Check, Zap, HardDrive, Import } from 'lucide-react';

function PlusIcon() {
  return <div className="w-4 h-4 rounded-full border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600 cursor-pointer hover:bg-zinc-800 transition-colors">+</div>;
}

interface LeftSidebarProps {
  sidebarOpen: boolean;
  imageCount: number;
  onSetFilterText: (text: string) => void;
  onShowImport: () => void;
}

export const LeftSidebar = ({ sidebarOpen, imageCount, onSetFilterText, onShowImport }: LeftSidebarProps) => (
  <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-zinc-900 border-r border-black flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}>
    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
      
      <section className="mb-8">
        <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">
          Catalogue <PlusIcon />
        </div>
        <div className="space-y-0.5">
           <button onClick={() => onSetFilterText('')} className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-200 transition-colors">
              <Database size={14} className="text-blue-500"/> Toutes les photos <span className="ml-auto opacity-30 text-[9px] font-mono">{imageCount}</span>
           </button>
           <button onClick={() => onSetFilterText('star 5')} className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-400 group">
              <Star size={14} className="text-amber-500 group-hover:scale-110 transition-transform"/> Meilleures Notes
           </button>
           <button onClick={() => onSetFilterText('picked')} className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-400">
              <Check size={14} className="text-emerald-500"/> Sélection active
           </button>
        </div>
      </section>

      <section className="mb-8">
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2 flex justify-between items-center">
          Smart Collections <Zap size={10} className="text-amber-600" />
        </div>
        <div className="space-y-1 px-1">
           {['Moyen Format GFX', 'ISO Élevés (>1600)', 'Optiques 35mm', 'Importations 24h'].map(item => (
             <div key={item} className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-zinc-200 p-1.5 cursor-pointer rounded hover:bg-zinc-800/50">
                <Zap size={10} className="text-zinc-700" /> {item}
             </div>
           ))}
        </div>
      </section>

      <section>
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">Folders</div>
        <div className="space-y-2 px-2">
           <div className="flex gap-2 items-center text-xs text-zinc-400 hover:text-white cursor-pointer"><HardDrive size={14} className="text-zinc-600"/> WORK_SSD_01</div>
           <div className="flex gap-2 items-center text-xs text-zinc-500 pl-4 border-l border-zinc-800 hover:text-white cursor-pointer">/ 2025_PROJECT_X</div>
           <div className="flex gap-2 items-center text-xs text-zinc-500 pl-4 border-l border-zinc-800 hover:text-white cursor-pointer">/ 2025_PERSONAL</div>
        </div>
      </section>
    </div>

    <div className="p-4 border-t border-black bg-zinc-950">
         <button onClick={onShowImport} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all border border-blue-400/30">
              <Import size={16} className="inline mr-2 mb-0.5"/> Importer RAW
         </button>
    </div>
  </div>
);

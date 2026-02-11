import { RefreshCw, Sun, Layers, Droplets, Wind, Palette } from 'lucide-react';
import type { CatalogImage, FlagType, EditState } from '../../types';

interface DevelopSlidersProps {
  activeImg: CatalogImage;
  onDispatchEvent: (eventType: string, payload: number | string | FlagType | Partial<EditState>) => void;
}

export const DevelopSliders = ({ activeImg, onDispatchEvent }: DevelopSlidersProps) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
      <span>Réglages de base</span>
      <RefreshCw size={12} className="text-zinc-700 hover:text-white cursor-pointer transition-colors" />
    </div>
    
    {([
      { label: 'Exposition', key: 'exposure' as const, icon: Sun },
      { label: 'Contraste', key: 'contrast' as const, icon: Layers },
      { label: 'Hautes Lumières', key: 'highlights' as const, icon: Droplets },
      { label: 'Ombres', key: 'shadows' as const, icon: Droplets },
      { label: 'Clarté', key: 'clarity' as const, icon: Wind },
      { label: 'Vibrance', key: 'vibrance' as const, icon: Palette },
      { label: 'Saturation', key: 'saturation' as const, icon: Droplets }
    ] as const).map(param => (
      <div key={param.key} className="space-y-1 group">
        <div className="flex justify-between text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <span className="flex items-center gap-2"><param.icon size={10} className="text-zinc-600"/> {param.label}</span>
          <span className="font-mono text-blue-500 font-bold">{activeImg.state.edits[param.key] > 0 ? '+' : ''}{activeImg.state.edits[param.key]}</span>
        </div>
        <input type="range" min="-100" max="100" 
               value={activeImg.state.edits[param.key]}
               onChange={(e) => onDispatchEvent('EDIT', { [param.key]: parseInt(e.target.value) })}
               className="w-full h-1 bg-black rounded appearance-none accent-blue-600 cursor-pointer" />
      </div>
    ))}
  </div>
);

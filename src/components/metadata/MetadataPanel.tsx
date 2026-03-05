import { Info } from 'lucide-react';
import type { CatalogImage } from '../../types';

interface MetadataPanelProps {
  activeImg: CatalogImage;
}

export const MetadataPanel = ({ activeImg }: MetadataPanelProps) => (
  <div className="p-5 space-y-10 animate-in fade-in duration-500">
    {/* SECTION: DETAILED METADATA */}
    <div className="space-y-6">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 flex justify-between">
        <span>Fiche Technique</span>
        <Info size={12} className="text-zinc-600" />
      </div>
      <div className="grid grid-cols-[100px_1fr] gap-y-4 text-[10px]">
        <span className="text-zinc-600 font-black uppercase text-[8px]">ID Unique (CAS)</span>
        <span className="text-zinc-400 font-mono text-[9px] break-all leading-tight bg-black/40 p-1.5 rounded border border-zinc-800">
          {activeImg.hash}
        </span>

        <span className="text-zinc-600 font-black uppercase text-[8px]">Révision</span>
        <span className="text-purple-400 font-mono text-[9px]">{activeImg.state.revision}</span>

        <span className="text-zinc-600 font-black uppercase text-[8px]">Date Capture</span>
        <span className="text-zinc-300">{new Date(activeImg.capturedAt).toLocaleString()}</span>

        <span className="text-zinc-600 font-black uppercase text-[8px]">Poids</span>
        <span className="text-zinc-400">{activeImg.sizeOnDisk}</span>

        <span className="text-zinc-600 font-black uppercase text-[8px]">Fichier Physique</span>
        <span className="text-zinc-500 truncate italic">{activeImg.filename}</span>
      </div>
    </div>
  </div>
);

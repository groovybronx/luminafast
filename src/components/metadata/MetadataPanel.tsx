import React from 'react';
import { Tag, X, Cloud, Info } from 'lucide-react';
import type { CatalogImage, EditState } from '../../types';

interface MetadataPanelProps {
  activeImg: CatalogImage;
  onDispatchEvent: (eventType: string, payload: number | string | 'pick' | 'reject' | null | Partial<EditState>) => void;
}

export const MetadataPanel = ({ activeImg, onDispatchEvent }: MetadataPanelProps) => (
  <div className="p-5 space-y-10 animate-in fade-in duration-500">
    
    {/* SECTION: DETAILED METADATA */}
    <div className="space-y-6">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 flex justify-between">
        <span>Fiche Technique</span>
        <Info size={12} className="text-zinc-600"/>
      </div>
      <div className="grid grid-cols-[100px_1fr] gap-y-4 text-[10px]">
        <span className="text-zinc-600 font-black uppercase text-[8px]">ID Unique (CAS)</span> 
        <span className="text-zinc-400 font-mono text-[9px] break-all leading-tight bg-black/40 p-1.5 rounded border border-zinc-800">{activeImg.hash}</span>
        
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

    {/* SECTION: KEYWORDING */}
    <div className="space-y-4 pt-4 border-t border-zinc-800">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        <Tag size={12} /> Tags & Mots-clés
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {activeImg.state.tags.map(t => (
          <span key={t} className="bg-zinc-800/80 text-zinc-400 px-2.5 py-1 rounded-md text-[10px] border border-zinc-700 hover:border-blue-500 cursor-pointer transition-all flex items-center gap-1.5 group">
            {t} <X size={10} className="text-zinc-600 group-hover:text-red-400" />
          </span>
        ))}
      </div>
      <div className="relative">
        <textarea 
          className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-[10px] text-zinc-400 h-24 outline-none focus:border-blue-600 transition-all shadow-inner focus:shadow-[0_0_15px_rgba(37,99,235,0.1)]"
          placeholder="Ajouter des mots-clés (séparés par virgules)..."
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const textarea = e.currentTarget;
              onDispatchEvent('ADD_TAG', textarea.value.trim());
              textarea.value = '';
            }
          }}
        />
        <div className="absolute bottom-2 right-2 text-[8px] text-zinc-600 font-mono">Entrée pour ajouter</div>
      </div>
    </div>

    {/* STATUS RECAP */}
    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2 shadow-2xl">
      <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
        <Cloud size={14}/> Cloud Sync Status
      </div>
      <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
        L'asset binaire est stocké localement. Les métadonnées sont prêtes pour la synchronisation CouchDB via PouchDB. Conflits détectés : <span className="text-emerald-500">0</span>.
      </p>
    </div>
  </div>
);

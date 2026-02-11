import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Library, Sliders, Database, Activity, HardDrive, 
  Search, Check, X, Maximize2, Grid, Zap, Layers, 
  Image as ImageIcon, History, Import, Monitor, 
  ChevronLeft, ChevronRight, ChevronDown, Camera, Star,
  Copy, RefreshCw, Cloud, SplitSquareVertical, Tag, Clock,
  MapPin, Aperture, Settings, Download, MoreHorizontal, Sun, 
  Wind, Droplets, Palette, Info
} from 'lucide-react';

// --- STYLES GLOBAUX ---
const GlobalStyles = () => (
  <style>{`
    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #09090b; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } }
    .animate-progress-fast { animation: progress-fast 1.2s ease-in-out infinite; }
    .img-render { transition: filter 0.15s ease-out, transform 0.2s ease-out; }
    input[type=range] { -webkit-appearance: none; background: transparent; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 4px; background: #3b82f6; cursor: pointer; border-radius: 1px; margin-top: -4px; }
    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #18181b; border-radius: 2px; }
  `}</style>
);

// --- HELPERS & MOCK DATA ---
const safeID = () => Math.random().toString(36).substring(2, 11);

const IMAGE_THEMES = [
  { term: 'portrait', lens: '56mm f/1.2', camera: 'Fujifilm X-T5', tags: ['Portrait', 'Studio', 'Flash'] },
  { term: 'landscape', lens: '10-24mm f/4', camera: 'Fujifilm GFX 100II', tags: ['Nature', 'Grand Angle', 'Voyage'] },
  { term: 'architecture', lens: '23mm f/2', camera: 'Fujifilm X-T5', tags: ['Urbain', 'Lignes', 'Architecture'] },
  { term: 'street', lens: '35mm f/1.4', camera: 'Fujifilm X-Pro3', tags: ['Street', 'Noir et Blanc', 'Instant'] },
  { term: 'fashion', lens: '90mm f/2', camera: 'Fujifilm X-H2', tags: ['Mode', 'Editorial', 'Couleur'] }
];

const generateImages = (count, startId = 0) => {
  return Array.from({ length: count }, (_, i) => {
    const id = startId + i;
    const theme = IMAGE_THEMES[id % IMAGE_THEMES.length];
    return {
      id: id,
      hash: `b3-${id.toString(16).padStart(12, '0')}-af92`,
      filename: `RAW_PRO_${2000 + id}.RAF`,
      url: `https://picsum.photos/seed/${id}/800/533`,
      capturedAt: new Date(2025, 1, Math.max(1, (id % 28))).toISOString(),
      exif: {
        iso: [160, 400, 800, 1600, 3200, 6400, 12800][id % 7],
        fstop: [1.2, 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16][id % 9],
        shutter: ["1/500", "1/2000", "1/4000", "1/125", "1/60", "1/30", "2.5s"][id % 7],
        lens: theme.lens,
        camera: theme.camera,
        location: ["Paris, France", "Tokyo, Japan", "Reykjavík, Iceland", "New York, USA"][id % 4]
      },
      state: {
        rating: Math.floor(Math.random() * 6),
        flag: Math.random() > 0.85 ? 'pick' : (Math.random() > 0.95 ? 'reject' : null),
        edits: { 
            exposure: 0, contrast: 0, highlights: 0, shadows: 0, 
            temp: 5500, tint: 0, vibrance: 0, saturation: 0, clarity: 0 
        },
        isSynced: Math.random() > 0.4,
        revision: `v${id}.0.1-b3`,
        tags: theme.tags
      },
      sizeOnDisk: `${(Math.random() * 10 + 20).toFixed(1)} MB`
    };
  });
};

const INITIAL_IMAGES = generateImages(60);

// --- SUB-COMPONENTS ---

function PlusIcon() {
    return <div className="w-4 h-4 rounded-full border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600 cursor-pointer hover:bg-zinc-800 transition-colors">+</div>;
}

const Histogram = () => (
  <div className="h-24 bg-zinc-900 rounded border border-zinc-800 relative overflow-hidden flex items-end px-1 gap-[1px]">
    {Array.from({ length: 40 }).map((_, i) => {
      const height = ((Math.sin(i * 0.3) + 1) * 40) + 10;
      return (
        <div 
          key={i} 
          className="flex-1 bg-zinc-700 opacity-50 hover:opacity-80 transition-opacity" 
          style={{ height: `${height}%` }}
        ></div>
      );
    })}
    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/20 to-transparent pointer-events-none"></div>
    <div className="absolute top-1 left-1 text-[9px] text-zinc-500 font-mono">
      ISO 200 | 35mm | f/2.8
    </div>
  </div>
);

const ArchitectureMonitor = ({ logs }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-zinc-950/95 backdrop-blur border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-[10px] font-mono z-[100] transition-opacity hover:opacity-100 opacity-80 pointer-events-none">
      <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-zinc-400 font-bold flex items-center gap-2">
          <Activity size={12} className="text-emerald-500" /> KERNEL MONITOR
        </span>
        <span className="text-zinc-600">Hybrid DB v1.7.0</span>
      </div>
      <div ref={scrollRef} className="h-28 overflow-y-auto p-2 space-y-1 bg-black/50 custom-scrollbar pointer-events-auto">
        {logs.length === 0 && <div className="text-zinc-700 italic">Waiting for system I/O...</div>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-zinc-600 shrink-0 opacity-50">[{log.time}]</span>
            <span className={`${log.color}`}>{log.message}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-zinc-800 border-t border-zinc-800 bg-zinc-900/50">
        <div className="p-2 text-center text-[9px]"><div className="text-zinc-600 uppercase mb-0.5">Write</div><div className="text-blue-500 font-bold">SQLite</div></div>
        <div className="p-2 text-center text-[9px]"><div className="text-zinc-600 uppercase mb-0.5">Read</div><div className="text-amber-500 font-bold">DuckDB</div></div>
        <div className="p-2 text-center text-[9px]"><div className="text-zinc-600 uppercase mb-0.5">Hash</div><div className="text-emerald-500 font-bold">BLAKE3</div></div>
      </div>
    </div>
  );
};

const ImportModal = ({ onClose, onImport }) => {
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('Analyse du volume...');
    const hasCalledImport = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    if (!hasCalledImport.current) {
                        hasCalledImport.current = true;
                        setStage('Insertion SQLite terminée');
                        setTimeout(onImport, 400);
                    }
                    return 100;
                }
                const next = prev + 4;
                if (next > 25) setStage('Génération des Hash BLAKE3...');
                if (next > 60) setStage('Indexation DuckDB OLAP...');
                if (next > 85) setStage('Création des Smart Previews...');
                return next;
            });
        }, 50);
        return () => clearInterval(interval);
    }, [onImport]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center">
            <div className="bg-zinc-950 border border-zinc-800 w-[500px] p-8 rounded-xl shadow-2xl space-y-6">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-2">
                        <Import className="text-blue-500" size={32} />
                    </div>
                    <h3 className="text-zinc-100 font-black text-xl tracking-tighter uppercase">Ingestion Haute Performance</h3>
                    <p className="text-zinc-500 text-xs">Traitement parallèle de 12 flux RAW simultanés</p>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        <span>{stage}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-100" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono border-t border-zinc-900 pt-6 text-zinc-600 uppercase">
                    <div>Volume: <span className="text-zinc-400">EOS_SD_01</span></div>
                    <div className="text-right">Vitesse: <span className="text-emerald-500">1.2 GB/s</span></div>
                </div>
                
                <button onClick={onClose} className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 rounded text-xs text-zinc-500 transition-colors uppercase font-bold tracking-widest">
                    Annuler l'opération
                </button>
            </div>
        </div>
    );
};

export default function App() {
  // --- ÉTATS ---
  const [activeView, setActiveView] = useState('library'); 
  const [images, setImages] = useState(INITIAL_IMAGES);
  const [selection, setSelection] = useState([0]); 
  const [logs, setLogs] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [eventLog, setEventLog] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState(5);
  const [sidebarOpen] = useState(true);

  // --- LOGIQUE SYSTÈME ---
  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 2 });
    let color = "text-zinc-400";
    if (type === 'sqlite') color = "text-blue-400";
    if (type === 'duckdb') color = "text-amber-400";
    if (type === 'io') color = "text-emerald-400";
    if (type === 'sync') color = "text-purple-400";

    setLogs(prev => [...prev.slice(-15), { time, message, color }]);
  }, []);

  const dispatchEvent = useCallback((eventType, payload) => {
    const event = { id: safeID(), timestamp: Date.now(), type: eventType, payload, targets: selection };
    setEventLog(prev => [event, ...prev]);

    setImages(prev => prev.map(img => {
        if (selection.includes(img.id)) {
            const newState = { ...img.state, isSynced: false };
            if (eventType === 'RATING') newState.rating = payload;
            if (eventType === 'FLAG') newState.flag = payload;
            if (eventType === 'EDIT') newState.edits = { ...newState.edits, ...payload };
            if (eventType === 'ADD_TAG') newState.tags = [...new Set([...newState.tags, payload])];
            return { ...img, state: newState };
        }
        return img;
    }));

    if (eventType !== 'EDIT') {
      addLog(`SQLite Transaction: ACID Commit for ${selection.length} assets`, 'sqlite');
      setTimeout(() => addLog(`PouchDB: Syncing revision ${safeID()} to CouchDB`, 'sync'), 1200);
    } else {
      addLog(`Event Sourcing: Replaying delta on FlatBuffer`, 'io');
    }
  }, [selection, addLog]);

    const toggleSelection = (id, e) => {
    const isMultiSelect = e.shiftKey || e.metaKey;
    setSelection(prev => {
      if (!isMultiSelect) return [id];
      if (prev.includes(id)) return prev.filter(i => i !== id);
      return [...prev, id];
    });
  };

  const handleImport = useCallback(() => {
    const newBatch = generateImages(15, images.length);
    setImages(prev => [...newBatch, ...prev]);
    setShowImport(false);
    addLog(`DUCKDB: Indexed ${newBatch.length} new binary references`, 'duckdb');
    addLog(`IO: File descriptors closed.`, 'io');
  }, [images.length, addLog]);

  // --- REQUÊTES ANALYTIQUES (DuckDB Simulation) ---
  const filteredImages = useMemo(() => {
    if (!filterText) return images;
    const q = filterText.toLowerCase();
    
    return images.filter(img => {
        if (q.startsWith('star')) return img.state.rating >= parseInt(q.split(' ')[1]);
        if (q.includes('gfx')) return img.exif.camera.toLowerCase().includes('gfx');
        if (q.includes('iso')) {
            const val = parseInt(q.replace(/[^0-9]/g, ''));
            return img.exif.iso >= val;
        }
        return (
            img.filename.toLowerCase().includes(q) || 
            img.exif.lens.toLowerCase().includes(q) ||
            img.state.tags.some(t => t.toLowerCase().includes(q))
        );
    });
  }, [images, filterText]);

  useEffect(() => {
    if (filterText.length > 2) {
      const start = performance.now();
      const resultCount = filteredImages.length;
      const end = performance.now();
      setTimeout(() => addLog(`DUCKDB Scan: ${resultCount} rows found in ${(end - start).toFixed(2)}ms`, 'duckdb'), 0);
    }
  }, [filteredImages, filterText, addLog]);

  // --- SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['1','2','3','4','5','0'].includes(e.key)) dispatchEvent('RATING', parseInt(e.key));
      if (e.key === 'p') dispatchEvent('FLAG', 'pick');
      if (e.key === 'x') dispatchEvent('FLAG', 'reject');
      if (e.key === 'u') dispatchEvent('FLAG', null);
      if (e.key === 'g') setActiveView('library');
      if (e.key === 'd') setActiveView('develop');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, dispatchEvent]);

  const activeImg = images.find(i => i.id === selection[0]) || images[0];

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden select-none">
      <GlobalStyles />
      
      {/* --- TOP NAV BAR --- */}
      <div className="h-9 bg-black border-b border-zinc-900 flex items-center px-4 justify-between shrink-0 z-50">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center font-black text-[10px] text-white">L</div>
            <span className="text-zinc-100 font-black tracking-tighter text-xs">LUMINA CORE</span>
          </div>
          <nav className="flex gap-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
            <span onClick={() => setActiveView('library')} className={`cursor-pointer hover:text-white transition-colors ${activeView==='library'?'text-blue-500 underline underline-offset-8':''}`}>Bibliothèque</span>
            <span onClick={() => setActiveView('develop')} className={`cursor-pointer hover:text-white transition-colors ${activeView==='develop'?'text-blue-500 underline underline-offset-8':''}`}>Développement</span>
            <span className="opacity-25">Cartes</span>
            <span className="opacity-25">Impression</span>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
           <div className="flex items-center gap-2"><Cloud size={12} className="text-blue-500"/> PouchDB ACTIVE</div>
           <div className="w-px h-3 bg-zinc-800"></div>
           <div className="flex items-center gap-2"><Settings size={12}/> V1.7.2-BETA</div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        
        {/* --- LEFT SIDEBAR (Collections & Folders) --- */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-zinc-900 border-r border-black flex flex-col shrink-0 transition-all duration-300 overflow-hidden`}>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            
            <section className="mb-8">
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">
                Catalogue <PlusIcon />
              </div>
              <div className="space-y-0.5">
                 <button onClick={() => setFilterText('')} className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-200 transition-colors">
                    <Database size={14} className="text-blue-500"/> Toutes les photos <span className="ml-auto opacity-30 text-[9px] font-mono">{images.length}</span>
                 </button>
                 <button onClick={() => setFilterText('star 5')} className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-400 group">
                    <Star size={14} className="text-amber-500 group-hover:scale-110 transition-transform"/> Meilleures Notes <span className="ml-auto opacity-30 text-[9px] font-mono">12</span>
                 </button>
                 <button onClick={() => setFilterText('picked')} className="w-full text-left p-2 rounded text-xs hover:bg-zinc-800 flex gap-2 text-zinc-400">
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
               <button onClick={() => setShowImport(true)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all border border-blue-400/30">
                    <Import size={16} className="inline mr-2 mb-0.5"/> Importer RAW
               </button>
          </div>
        </div>

        {/* --- MAIN CENTER CANVAS --- */}
        <div className="flex-1 flex flex-col bg-zinc-950 min-w-0 relative">
            
            {/* TOOLBAR */}
            <div className="h-11 bg-zinc-900/60 border-b border-black flex items-center justify-between px-4 shrink-0 backdrop-blur-sm">
                <div className="flex gap-3 items-center">
                    <div className="flex bg-black p-0.5 rounded-lg border border-zinc-800 shadow-inner">
                        <button onClick={() => setActiveView('library')} className={`p-1.5 rounded-md transition-all ${activeView==='library'?'bg-zinc-700 text-white shadow-lg':''}`} title="Grille (G)"><Grid size={16}/></button>
                        <button onClick={() => setActiveView('develop')} className={`p-1.5 rounded-md transition-all ${activeView==='develop'?'bg-zinc-700 text-white shadow-lg':''}`} title="Développement (D)"><Maximize2 size={16}/></button>
                    </div>
                    {activeView === 'develop' && (
                        <div className="flex gap-1 border-l border-zinc-800 pl-3">
                            <button onClick={() => setShowBeforeAfter(!showBeforeAfter)} className={`p-2 rounded border border-zinc-800 transition-colors ${showBeforeAfter?'bg-blue-600 text-white border-blue-500':'text-zinc-500 hover:text-zinc-300'}`}>
                                <SplitSquareVertical size={16}/>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/50 border border-zinc-800 rounded-full px-4 py-1.5 shadow-inner group focus-within:border-blue-500/50 transition-all">
                        <Search size={14} className="text-zinc-600 group-focus-within:text-blue-500"/>
                        <input className="bg-transparent border-none outline-none text-xs w-64 text-zinc-300 font-mono placeholder:text-zinc-700" 
                               placeholder="Requête DuckDB (ex: star 5, iso 3200...)" 
                               value={filterText} onChange={e=>setFilterText(e.target.value)} />
                        {filterText && <X size={12} className="cursor-pointer text-zinc-600 hover:text-white" onClick={() => setFilterText('')}/>}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-32">
                        <ImageIcon size={10} className="text-zinc-600" />
                        <input type="range" min="2" max="10" value={thumbnailSize} onChange={e => setThumbnailSize(parseInt(e.target.value))} className="flex-1 accent-zinc-500" />
                        <ImageIcon size={16} className="text-zinc-600" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeView === 'library' ? (
                    <div className="overflow-y-auto p-4 grid gap-3 content-start custom-scrollbar"
                         style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize * 30}px, 1fr))` }}>
                        {filteredImages.map(img => {
                            const isSelected = selection.includes(img.id);
                            return (
                                <div key={img.id} 
                                     onClick={(e) => toggleSelection(img.id, e)}
                                     onDoubleClick={() => setActiveView('develop')}
                                     className={`aspect-[3/2] bg-zinc-900 border transition-all relative group rounded-lg overflow-hidden ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/20 z-10 scale-[0.97]' : 'border-zinc-800 hover:border-zinc-700 shadow-md'}`}>
                                    
                                    <img src={img.url} alt="" className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity" loading="lazy" />
                                    
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1 shadow-lg">
                                        {img.state.isSynced ? <Cloud size={10} className="text-blue-400"/> : <RefreshCw size={10} className="text-amber-500 animate-spin"/>}
                                    </div>
                                    
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2 flex justify-between items-end translate-y-1 group-hover:translate-y-0 transition-transform">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-[9px] font-mono text-zinc-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 uppercase tracking-tighter">{img.filename}</div>
                                            <div className="text-amber-400 text-[9px] flex drop-shadow-md">{'★'.repeat(img.state.rating)}</div>
                                        </div>
                                        <div className="text-[8px] font-mono text-zinc-500">{img.exif.iso} ISO</div>
                                    </div>

                                    {img.state.flag === 'pick' && <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-lg"></div>}
                                    {img.state.flag === 'reject' && <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-red-600 border-2 border-zinc-950 rounded-full shadow-lg"></div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-12 bg-zinc-950">
                        <div className={`flex w-full h-full gap-6 ${showBeforeAfter ? 'flex-row' : 'flex-col'}`}>
                            {showBeforeAfter && (
                                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden shadow-2xl">
                                    <img src={activeImg.url} alt="Avant" className="w-full h-full object-contain grayscale opacity-30 scale-105" />
                                    <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest border border-zinc-700">Original RAW</div>
                                </div>
                            )}
                            <div className="flex-1 shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-xl border border-zinc-800 relative flex items-center justify-center overflow-hidden bg-zinc-900 group">
                                <img 
                                    src={activeImg.url} 
                                    alt="Après" 
                                    className="w-full h-full object-contain img-render"
                                    style={{ 
                                        filter: `
                                            brightness(${100 + activeImg.state.edits.exposure * 2}%) 
                                            contrast(${100 + activeImg.state.edits.contrast}%)
                                            saturate(${100 + activeImg.state.edits.saturation + (activeImg.state.edits.vibrance * 0.5)}%)
                                            blur(${activeImg.state.edits.clarity < 0 ? Math.abs(activeImg.state.edits.clarity)/10 : 0}px)
                                        `
                                    }} 
                                />
                                <div className="absolute bottom-6 left-6 font-mono text-[9px] text-emerald-500 bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/20 backdrop-blur-md shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    CAS_HASH: {activeImg.hash}
                                </div>
                                <div className="absolute top-4 right-4 text-[10px] bg-blue-600 text-white font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">Aperçu Dynamique</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CONTEXTUAL BATCH BAR --- */}
                {selection.length > 1 && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/95 border border-blue-500/50 rounded-full px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-8 z-[60] animate-in slide-in-from-bottom-6 duration-300">
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-blue-400 uppercase tracking-widest">{selection.length} ASSETS</span>
                            <span className="text-[9px] text-zinc-600 font-mono uppercase">Batch Processing</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800"></div>
                        <div className="flex gap-6">
                            <button onClick={() => dispatchEvent('FLAG', 'pick')} className="text-zinc-400 hover:text-emerald-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Check size={18}/> Pick</button>
                            <button onClick={() => dispatchEvent('RATING', 5)} className="text-zinc-400 hover:text-amber-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Star size={18}/> Favoris</button>
                            <button onClick={() => addLog('Metadata batch sync triggered', 'sqlite')} className="text-zinc-400 hover:text-blue-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><Tag size={18}/> Tags</button>
                            <button onClick={() => addLog('Re-indexing batch...', 'duckdb')} className="text-zinc-400 hover:text-purple-500 transition-colors flex flex-col items-center gap-1 text-[9px] font-bold uppercase"><RefreshCw size={18}/> Sync</button>
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full cursor-pointer text-zinc-500 hover:text-white transition-colors" onClick={() => setSelection([selection[0]])}>
                            <X size={16} />
                        </div>
                    </div>
                )}
            </div>
            
            {/* FILMSTRIP */}
            <div className="relative h-32 shrink-0"> 
              <div className="absolute inset-0 bg-zinc-900 border-t border-black flex flex-col">
                <div className="h-7 flex items-center justify-between px-4 bg-black/40 text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-black">
                   <div className="flex gap-6 items-center">
                       <span>Filmstrip</span>
                       <span className="w-px h-3 bg-zinc-800"></span>
                       <span className="text-blue-500">{selection.length} / {images.length} photos</span>
                   </div>
                   <div className="flex gap-4">
                       <ChevronLeft size={16} className="cursor-pointer hover:text-white transition-colors" />
                       <ChevronRight size={16} className="cursor-pointer hover:text-white transition-colors" />
                   </div>
                </div>
                <div className="flex-1 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar py-3 w-full">
                    {images.map(img => (
                        <div key={img.id} onClick={(e) => toggleSelection(img.id, e)} 
                             className={`h-20 aspect-[3/2] bg-zinc-800 shrink-0 border-2 transition-all relative rounded-md overflow-hidden ${selection.includes(img.id)?'border-blue-500 scale-110 z-10 shadow-2xl':'border-transparent opacity-40 hover:opacity-80'}`}>
                            <img src={img.url} className="w-full h-full object-cover" alt="" />
                        </div>
                    ))}
                </div>
              </div>
            </div>
        </div>

        {/* --- RIGHT SIDEBAR (The 765-line Density) --- */}
        <div className="w-80 bg-zinc-900 border-l border-black flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
            
            {/* PANEL: HISTOGRAM & EXIF */}
            <div className="p-5 border-b border-black bg-zinc-950 shrink-0 space-y-4">
                <Histogram />
                <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50"><Camera size={12} className="text-zinc-600"/> {activeImg.exif.iso} ISO</div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 justify-end"><Clock size={12} className="text-zinc-600"/> {activeImg.exif.shutter}</div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50"><Aperture size={12} className="text-zinc-600"/> f/{activeImg.exif.fstop}</div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 justify-end truncate"><MapPin size={12} className="text-zinc-600"/> {activeImg.exif.location.split(',')[0]}</div>
                    <div className="col-span-2 text-zinc-400 mt-1 font-bold text-center border-t border-zinc-900 pt-2">{activeImg.exif.lens}</div>
                    <div className="col-span-2 text-zinc-600 italic text-center text-[9px]">{activeImg.exif.camera}</div>
                </div>
            </div>

            <div className="flex-1 pb-10">
                {activeView === 'develop' ? (
                    <div className="p-5 space-y-10 animate-in fade-in duration-500">
                        
                        {/* SECTION: TONE */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                                <span>Réglages de base</span>
                                <RefreshCw size={12} className="text-zinc-700 hover:text-white cursor-pointer transition-colors" />
                            </div>
                            
                            {/* Sliders denses */}
                            {[
                                { label: 'Exposition', key: 'exposure', icon: Sun },
                                { label: 'Contraste', key: 'contrast', icon: Layers },
                                { label: 'Hautes Lumières', key: 'highlights', icon: Droplets },
                                { label: 'Ombres', key: 'shadows', icon: Droplets },
                                { label: 'Clarté', key: 'clarity', icon: Wind },
                                { label: 'Vibrance', key: 'vibrance', icon: Palette },
                                { label: 'Saturation', key: 'saturation', icon: Droplets }
                            ].map(param => (
                                <div key={param.key} className="space-y-1 group">
                                    <div className="flex justify-between text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                        <span className="flex items-center gap-2"><param.icon size={10} className="text-zinc-600"/> {param.label}</span>
                                        <span className="font-mono text-blue-500 font-bold">{activeImg.state.edits[param.key] > 0 ? '+' : ''}{activeImg.state.edits[param.key]}</span>
                                    </div>
                                    <input type="range" min="-100" max="100" 
                                           value={activeImg.state.edits[param.key]}
                                           onChange={(e) => dispatchEvent('EDIT', { [param.key]: parseInt(e.target.value) })}
                                           className="w-full h-1 bg-black rounded appearance-none accent-blue-600 cursor-pointer" />
                                </div>
                            ))}
                        </div>

                        {/* SECTION: HISTORY LOG */}
                        <div className="pt-6 border-t border-zinc-800">
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex justify-between items-center">
                                <span className="flex items-center gap-2"><History size={14} /> Historique (Events)</span>
                                <span className="text-[9px] text-blue-500 font-bold border border-blue-900 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-900 transition-colors">Snapshot</span>
                            </div>
                            <div className="h-48 overflow-y-auto bg-black/50 p-3 text-[9px] font-mono text-zinc-500 rounded-xl border border-zinc-800/50 custom-scrollbar shadow-inner">
                                {eventLog.length === 0 && <div className="opacity-30 italic">No edits recorded yet.</div>}
                                {eventLog.slice(0, 20).map(e => (
                                    <div key={e.id} className="mb-2 border-l border-zinc-800 pl-2 hover:border-blue-500 transition-colors group">
                                        <div className="text-zinc-400 group-hover:text-blue-400">{e.type}</div>
                                        <div className="opacity-40 text-[8px]">{new Date(e.timestamp).toLocaleTimeString()} • {JSON.stringify(e.payload)}</div>
                                    </div>
                                ))}
                                <div className="italic opacity-20 mt-4 text-center">--- Initial Import v1.0 ---</div>
                            </div>
                        </div>
                    </div>
                ) : (
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
                                <span className="text-zinc-500 truncate italic">/Volumes/WORK/RAW_2025/{activeImg.filename}</span>
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
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            dispatchEvent('ADD_TAG', e.target.value.trim());
                                            e.target.value = '';
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
                )}
            </div>
        </div>
      </div>

      <ArchitectureMonitor logs={logs} />
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      
      {/* GLOBAL KEYBOARD OVERLAY (Visual only) */}
      <div className="fixed bottom-4 left-4 flex gap-2 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
          {['G', 'D', 'P', 'X', '1-5'].map(k => (
              <span key={k} className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-mono text-zinc-500">{k}</span>
          ))}
      </div>

    </div>
  );
}

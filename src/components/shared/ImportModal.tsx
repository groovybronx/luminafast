import { useState, useEffect, useRef } from 'react';
import { Import } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImport: () => void;
}

export const ImportModal = ({ onClose, onImport }: ImportModalProps) => {
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

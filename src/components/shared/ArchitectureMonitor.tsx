import { useState, useEffect, useRef } from 'react';
import { Activity, Maximize2, ChevronDown } from 'lucide-react';
import type { LogEntry } from '../../types';

interface ArchitectureMonitorProps {
  logs: LogEntry[];
}

export const ArchitectureMonitor = ({ logs }: ArchitectureMonitorProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div
      className={`fixed bottom-4 right-4 bg-zinc-950/95 backdrop-blur border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-[10px] font-mono z-100 transition-all hover:opacity-100 opacity-80 pointer-events-none ${isMinimized ? 'w-12 h-12' : 'w-80'}`}
    >
      <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-zinc-400 font-bold flex items-center gap-2">
          <Activity size={12} className="text-emerald-500" /> {!isMinimized && 'KERNEL MONITOR'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="pointer-events-auto text-zinc-600 hover:text-white transition-colors"
            title={isMinimized ? 'Agrandir' : 'Minimiser'}
          >
            {isMinimized ? <Maximize2 size={12} /> : <ChevronDown size={12} />}
          </button>
          {!isMinimized && <span className="text-zinc-600">Hybrid DB v1.7.0</span>}
        </div>
      </div>
      {!isMinimized && (
        <>
          <div
            ref={scrollRef}
            className="h-28 overflow-y-auto p-2 space-y-1 bg-black/50 custom-scrollbar pointer-events-auto"
          >
            {logs.length === 0 && (
              <div className="text-zinc-700 italic">Waiting for system I/O...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-zinc-600 shrink-0 opacity-50">[{log.time}]</span>
                <span className={`${log.color}`}>{log.message}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-800 border-t border-zinc-800 bg-zinc-900/50">
            <div className="p-2 text-center text-[9px]">
              <div className="text-zinc-600 uppercase mb-0.5">Write</div>
              <div className="text-blue-500 font-bold">SQLite</div>
            </div>
            <div className="p-2 text-center text-[9px]">
              <div className="text-zinc-600 uppercase mb-0.5">Read</div>
              <div className="text-amber-500 font-bold">DuckDB</div>
            </div>
            <div className="p-2 text-center text-[9px]">
              <div className="text-zinc-600 uppercase mb-0.5">Hash</div>
              <div className="text-emerald-500 font-bold">BLAKE3</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

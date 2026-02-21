import { History } from 'lucide-react';
import type { CatalogEvent } from '../../types';

interface HistoryPanelProps {
  eventLog: CatalogEvent[];
}

export const HistoryPanel = ({ eventLog }: HistoryPanelProps) => (
  <div className="pt-6 border-t border-zinc-800">
    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex justify-between items-center">
      <span className="flex items-center gap-2">
        <History size={14} /> Historique (Events)
      </span>
      <span className="text-[9px] text-blue-500 font-bold border border-blue-900 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-900 transition-colors">
        Snapshot
      </span>
    </div>
    <div className="h-48 overflow-y-auto bg-black/50 p-3 text-[9px] font-mono text-zinc-500 rounded-xl border border-zinc-800/50 custom-scrollbar shadow-inner">
      {eventLog.length === 0 && <div className="opacity-30 italic">No edits recorded yet.</div>}
      {eventLog.slice(0, 20).map((e) => (
        <div
          key={e.id}
          className="mb-2 border-l border-zinc-800 pl-2 hover:border-blue-500 transition-colors group"
        >
          <div className="text-zinc-400 group-hover:text-blue-400">{e.type}</div>
          <div className="opacity-40 text-[8px]">
            {new Date(e.timestamp).toLocaleTimeString()} • {JSON.stringify(e.payload)}
          </div>
        </div>
      ))}
      <div className="italic opacity-20 mt-4 text-center">--- Initial Import v1.0 ---</div>
    </div>
  </div>
);

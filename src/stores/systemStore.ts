import { create } from 'zustand';
import type { LogEntry } from '../types';

interface SystemStore {
  // État
  logs: LogEntry[];
  importState: {
    isImporting: boolean;
    progress: number;
    currentFile: string;
  };
  appReady: boolean;
  
  // Actions
  addLog: (message: string, type?: string) => void;
  clearLogs: () => void;
  setImportState: (state: Partial<SystemStore['importState']>) => void;
  setAppReady: (ready: boolean) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
  // État initial
  logs: [],
  importState: {
    isImporting: false,
    progress: 0,
    currentFile: ''
  },
  appReady: false,
  
  // Actions
  addLog: (message: string, type = 'info') => set((state) => {
    const time = new Date().toLocaleTimeString('fr-FR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    let color = "text-zinc-400";
    if (type === 'sqlite') color = "text-blue-400";
    if (type === 'duckdb') color = "text-amber-400";
    if (type === 'io') color = "text-emerald-400";
    if (type === 'sync') color = "text-purple-400";
    
    const newLog: LogEntry = { time, message, color };
    
    return {
      logs: [...state.logs, newLog].slice(-15)
    };
  }),
  
  clearLogs: () => set({ logs: [] }),
  
  setImportState: (newState: Partial<SystemStore['importState']>) => set((state) => ({
    importState: { ...state.importState, ...newState }
  })),
  
  setAppReady: (ready: boolean) => set({ appReady: ready })
}));

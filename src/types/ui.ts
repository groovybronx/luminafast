// --- Domain Types: UI State ---

export type ActiveView = 'library' | 'develop';

export type LogType = 'info' | 'sqlite' | 'duckdb' | 'io' | 'sync';

export interface LogEntry {
  time: string;
  message: string;
  color: string;
}

export interface SliderParam {
  label: string;
  key: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

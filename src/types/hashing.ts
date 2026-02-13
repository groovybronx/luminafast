export enum HashType {
  Blake3 = 'Blake3',
}

export interface FileHash {
  hash: string;
  hash_type: HashType;
  file_size: number;
  hashed_at: string; // ISO datetime
}

export interface DuplicateInfo {
  hash: string;
  file_paths: string[];
  file_size: number;
  first_detected: string; // ISO datetime
}

export interface DuplicateAnalysis {
  total_files: number;
  duplicate_groups: number;
  duplicate_files: number;
  wasted_space: number;
  duplicates: DuplicateInfo[];
}

export interface HashProgress {
  processed_files: number;
  total_files: number;
  current_file?: string;
  progress: number; // 0.0 - 1.0
}

export enum HashErrorType {
  FileNotFound = 'FileNotFound',
  PermissionDenied = 'PermissionDenied',
  ReadError = 'ReadError',
  FileTooLarge = 'FileTooLarge',
  HashError = 'HashError',
}

export interface HashError {
  type: HashErrorType;
  message: string;
  file_path?: string;
  file_size?: number;
}

export interface HashConfig {
  max_file_size?: number;
  thread_count?: number;
  chunk_size: number;
  enable_cache: boolean;
}

export interface HashBenchmarkResult {
  file_path: string;
  file_size: number;
  iterations: number;
  total_time_ms: number;
  avg_time_per_hash_ms: number;
  throughput_mbps: number;
  all_hashes_identical: boolean;
  sample_hash: string;
}

// Types pour les callbacks et événements
export type HashProgressCallback = (progress: HashProgress) => void;
export type HashResultCallback = (result: FileHash | FileHash[]) => void;
export type HashErrorCallback = (error: HashError) => void;

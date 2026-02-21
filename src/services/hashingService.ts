import type {
  FileHash,
  DuplicateAnalysis,
  HashBenchmarkResult,
  HashError,
  HashProgressCallback,
} from '@/types';
import { HashType, HashErrorType } from '../types/hashing';

// Déclarations pour les globals Tauri
declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

/**
 * Service TypeScript pour le hachage BLAKE3
 * Wrapper autour des commandes Tauri avec gestion d'erreurs robuste
 */
export class HashingService {
  /**
   * Log uniquement en mode développement (pas en production)
   */
  private static logDev(message: string, ...args: unknown[]): void {
    if (import.meta.env.DEV) {
      console.warn(message, ...args);
    }
  }

  /**
   * Calcule le hash BLAKE3 d'un fichier
   */
  static async hashFile(filePath: string): Promise<FileHash> {
    try {
      const result = await this.invokeTauri('hash_file', { filePath });
      return this.parseFileHash(result);
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Calcule les hashes de plusieurs fichiers en parallèle
   */
  static async hashFilesBatch(
    filePaths: string[],
    _progressCallback?: HashProgressCallback,
  ): Promise<Map<string, FileHash>> {
    try {
      const result = await this.invokeTauri('hash_files_batch', { filePaths });

      // Convertir le tableau en Map
      const hashMap = new Map<string, FileHash>();
      if (Array.isArray(result)) {
        for (const [filePath, fileHash] of result) {
          hashMap.set(filePath, this.parseFileHash(fileHash));
        }
      }

      return hashMap;
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Détecte les doublons dans une liste de fichiers
   */
  static async detectDuplicates(
    filePaths: string[],
    _progressCallback?: HashProgressCallback,
  ): Promise<DuplicateAnalysis> {
    try {
      const result = await this.invokeTauri('detect_duplicates', { filePaths });
      return this.parseDuplicateAnalysis(result);
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Vérifie l'intégrité d'un fichier
   */
  static async verifyFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const result = await this.invokeTauri('verify_file_integrity', {
        filePath,
        expectedHash,
      });
      return Boolean(result);
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Vide le cache des hashes
   */
  static async clearCache(): Promise<void> {
    try {
      await this.invokeTauri('clear_hash_cache', {});
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Retourne les statistiques du cache
   */
  static async getCacheStats(): Promise<{ count: number; sizeBytes: number }> {
    try {
      const result = await this.invokeTauri('get_hash_cache_stats', {});

      if (Array.isArray(result) && result.length === 2) {
        return {
          count: Number(result[0]),
          sizeBytes: Number(result[1]),
        };
      }

      throw new Error('Invalid cache stats response');
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Test de performance du hachage
   */
  static async benchmarkHashing(filePath: string, iterations = 5): Promise<HashBenchmarkResult> {
    try {
      const result = await this.invokeTauri('benchmark_hashing', {
        filePath,
        iterations,
      });
      return this.parseBenchmarkResult(result);
    } catch (error) {
      throw this.parseError(error);
    }
  }

  /**
   * Vérifie si un fichier existe et est accessible
   */
  static async validateFilePath(filePath: string): Promise<boolean> {
    try {
      // Tenter d'obtenir les métadonnées du fichier
      await this.invokeTauri('hash_file', { filePath });
      return true;
    } catch (error) {
      const parsedError = this.parseError(error);
      return parsedError.type !== HashErrorType.FileNotFound;
    }
  }

  /**
   * Calcule le hash d'un fichier avec timeout
   */
  static async hashFileWithTimeout(filePath: string, timeoutMs = 30000): Promise<FileHash> {
    return Promise.race([
      this.hashFile(filePath),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Hashing timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Analyse un répertoire pour détecter les doublons
   */
  static async analyzeDirectoryForDuplicates(
    directoryPath: string,
    recursive = true,
    _progressCallback?: HashProgressCallback,
  ): Promise<DuplicateAnalysis> {
    try {
      const result = await this.invokeTauri('scan_directory_for_duplicates', {
        directoryPath,
        recursive,
      });
      return this.parseDuplicateAnalysis(result);
    } catch (error) {
      throw this.parseError(error);
    }
  }

  // --- Méthodes privées ---

  /**
   * Invoque une commande Tauri avec gestion d'erreur
   */
  private static async invokeTauri(
    command: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      return window.__TAURI_INTERNALS__.invoke(command, args);
    }

    // Fallback pour développement/testing
    this.logDev(`Tauri not available, mocking command: ${command}`, args);
    return this.mockTauriCommand(command, args);
  }

  /**
   * Mock des commandes Tauri pour développement
   */
  private static mockTauriCommand(command: string, args: Record<string, unknown>): unknown {
    switch (command) {
      case 'hash_file':
        return {
          hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
          hash_type: 'Blake3',
          file_size: 1024,
          hashed_at: new Date().toISOString(),
        };

      case 'hash_files_batch': {
        const filePaths = args.filePaths as string[];
        return filePaths.map((path: string) => [
          path,
          {
            hash: 'mock_hash_b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b34',
            hash_type: 'Blake3',
            file_size: 1024,
            hashed_at: new Date().toISOString(),
          },
        ]);
      }

      case 'detect_duplicates': {
        const duplicatePaths = args.filePaths as string[];
        return {
          total_files: duplicatePaths.length,
          duplicate_groups: 0,
          duplicate_files: 0,
          wasted_space: 0,
          duplicates: [],
        };
      }

      case 'scan_directory_for_duplicates':
        return {
          total_files: 0,
          duplicate_groups: 0,
          duplicate_files: 0,
          wasted_space: 0,
          duplicates: [],
        };

      case 'verify_file_integrity':
        return true;

      case 'clear_hash_cache':
        return null;

      case 'get_hash_cache_stats':
        return [0, 0];

      case 'benchmark_hashing':
        return {
          file_path: args.filePath,
          file_size: 1024,
          iterations: args.iterations,
          total_time_ms: 100,
          avg_time_per_hash_ms: 20,
          throughput_mbps: 51.2,
          all_hashes_identical: true,
          sample_hash: 'mock_hash_benchmark',
        };

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Parse et valide un FileHash
   */
  private static parseFileHash(data: unknown): FileHash {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid FileHash response');
    }

    const dataObj = data as Record<string, unknown>;
    return {
      hash: String(dataObj.hash || ''),
      hash_type: ((dataObj.hash_type as string) || 'Blake3') as HashType,
      file_size: Number(dataObj.file_size || 0),
      hashed_at: (dataObj.hashed_at as string) || new Date().toISOString(),
    };
  }

  /**
   * Parse et valide une DuplicateAnalysis
   */
  private static parseDuplicateAnalysis(data: unknown): DuplicateAnalysis {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid DuplicateAnalysis response');
    }

    const dataObj = data as Record<string, unknown>;
    return {
      total_files: Number(dataObj.total_files || 0),
      duplicate_groups: Number(dataObj.duplicate_groups || 0),
      duplicate_files: Number(dataObj.duplicate_files || 0),
      wasted_space: Number(dataObj.wasted_space || 0),
      duplicates: Array.isArray(dataObj.duplicates)
        ? (dataObj.duplicates as unknown[]).map((d: unknown) => {
            const dObj = d as Record<string, unknown>;
            return {
              hash: String(dObj.hash || ''),
              file_paths: Array.isArray(dObj.file_paths)
                ? (dObj.file_paths as unknown[]).map(String)
                : [],
              file_size: Number(dObj.file_size || 0),
              first_detected: (dObj.first_detected as string) || new Date().toISOString(),
            };
          })
        : [],
    };
  }

  /**
   * Parse et valide un HashBenchmarkResult
   */
  private static parseBenchmarkResult(data: unknown): HashBenchmarkResult {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid HashBenchmarkResult response');
    }

    const dataObj = data as Record<string, unknown>;
    return {
      file_path: String(dataObj.file_path || ''),
      file_size: Number(dataObj.file_size || 0),
      iterations: Number(dataObj.iterations || 0),
      total_time_ms: Number(dataObj.total_time_ms || 0),
      avg_time_per_hash_ms: Number(dataObj.avg_time_per_hash_ms || 0),
      throughput_mbps: Number(dataObj.throughput_mbps || 0),
      all_hashes_identical: Boolean(dataObj.all_hashes_identical),
      sample_hash: String(dataObj.sample_hash || ''),
    };
  }

  /**
   * Parse et normalise les erreurs
   */
  private static parseError(error: unknown): HashError {
    if (error instanceof Error) {
      // Tenter de déterminer le type d'erreur basé sur le message
      const message = error.message.toLowerCase();

      if (message.includes('not found') || message.includes('non trouvé')) {
        return {
          type: HashErrorType.FileNotFound,
          message: error.message,
        };
      }

      if (message.includes('permission') || message.includes('refusée')) {
        return {
          type: HashErrorType.PermissionDenied,
          message: error.message,
        };
      }

      if (message.includes('too large') || message.includes('trop gros')) {
        return {
          type: HashErrorType.FileTooLarge,
          message: error.message,
        };
      }

      if (message.includes('read') || message.includes('lecture')) {
        return {
          type: HashErrorType.ReadError,
          message: error.message,
        };
      }

      return {
        type: HashErrorType.HashError,
        message: error.message,
      };
    }

    // Erreur string ou autre type
    return {
      type: HashErrorType.HashError,
      message: String(error || 'Unknown error'),
    };
  }
}

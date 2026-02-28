/**
 * Service TypeScript wrapper pour le filesystem Tauri
 * Fournit une interface moderne avec gestion d'erreurs et fallbacks
 */

import {
  FileEvent,
  FileEventType,
  FileLock,
  FileLockType,
  WatcherConfig,
  WatcherStats,
  FilesystemState,
  FilesystemError,
  AcquireLockOptions,
  ListDirectoryOptions,
  FileMetadata,
  FilesystemMonitoringEvent,
  FilesystemResult,
  validateWatcherConfig,
  validateLockOptions,
  isValidPath,
} from '../types/filesystem';

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Service filesystem avec interface Tauri + fallbacks
 */
export class FilesystemService {
  private static instance: FilesystemService;
  private isTauriAvailable: boolean;
  private eventListeners: Map<string, Set<(event: FilesystemMonitoringEvent) => void>> = new Map();

  private constructor() {
    this.isTauriAvailable = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  /**
   * Log uniquement en mode développement (pas en production)
   */
  private static logDev(message: string, ...args: unknown[]): void {
    if (import.meta.env.DEV) {
      console.warn(message, ...args);
    }
  }

  /**
   * Get Tauri invoke function (handle both __TAURI__ and __TAURI_INTERNALS__)
   */
  private static getInvoke() {
    if (typeof window !== 'undefined') {
      // Try __TAURI__ first (normal case)
      const tauriWindow = window as unknown as {
        __TAURI__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
        __TAURI_INTERNALS__?: {
          invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
        };
      };

      if (tauriWindow.__TAURI__?.invoke) {
        return tauriWindow.__TAURI__.invoke;
      }
      // Fallback to __TAURI_INTERNALS__ (brownfield pattern)
      if (tauriWindow.__TAURI_INTERNALS__?.invoke) {
        return tauriWindow.__TAURI_INTERNALS__.invoke;
      }
    }

    // Mock fallback for tests
    return async (command: string, args?: Record<string, unknown>) => {
      FilesystemService.logDev(
        '[MOCK] FilesystemService: Tauri non disponible, fallback mock utilisé',
        { command, args },
      );
      throw new Error(`Tauri not available: ${command}`);
    };
  }

  /**
   * Récupère l'instance singleton du service
   */
  static getInstance(): FilesystemService {
    if (!FilesystemService.instance) {
      FilesystemService.instance = new FilesystemService();
    }
    return FilesystemService.instance;
  }

  /**
   * Vérifie si Tauri est disponible
   */
  private async checkTauriAvailability(): Promise<boolean> {
    try {
      if (!this.isTauriAvailable) return false;

      // Test simple avec une commande existante
      const invokeFn = FilesystemService.getInvoke();
      await invokeFn('path_exists', { path: '/' });
      return true;
    } catch {
      this.isTauriAvailable = false;
      return false;
    }
  }

  /**
   * Wrapper invoke avec gestion d'erreurs
   */
  private async invokeCommand<T>(
    command: string,
    args: Record<string, unknown> = {},
  ): Promise<FilesystemResult<T>> {
    try {
      if (!(await this.checkTauriAvailability())) {
        return this.createMockResult<T>(command, args);
      }

      const invokeFn = FilesystemService.getInvoke();
      const result = (await invokeFn(command, args)) as T;
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapErrorToEnum(error),
        message: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Map une erreur Tauri vers notre enum
   */
  private mapErrorToEnum(error: unknown): FilesystemError {
    const message = this.extractErrorMessage(error).toLowerCase();

    if (message.includes('permission denied')) return FilesystemError.PermissionDenied;
    if (message.includes('not found')) return FilesystemError.FileNotFound;
    if (message.includes('lock')) return FilesystemError.LockAlreadyAcquired;
    if (message.includes('timeout')) return FilesystemError.LockTimeout;
    if (message.includes('invalid path')) return FilesystemError.InvalidPath;
    if (message.includes('too large')) return FilesystemError.FileTooLarge;
    if (message.includes('mime')) return FilesystemError.MimeError;

    return FilesystemError.IoError;
  }

  /**
   * Extrait le message d'erreur
   */
  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    )
      return error.message;
    if (
      error &&
      typeof error === 'object' &&
      'toString' in error &&
      typeof error.toString === 'function'
    )
      return error.toString();
    return 'Unknown error';
  }

  /**
   * Crée un résultat mock pour le développement sans Tauri
   */
  private createMockResult<T>(
    command: string,
    _args: Record<string, unknown>,
  ): FilesystemResult<T> {
    switch (command) {
      case 'start_watcher':
        return {
          success: true,
          data: 'mock-watcher-id' as T,
        };

      case 'stop_watcher':
      case 'release_lock':
        return {
          success: true,
          data: undefined as T,
        };

      case 'acquire_lock':
        return {
          success: true,
          data: 'mock-lock-id' as T,
        };

      case 'get_pending_events':
        return {
          success: true,
          data: [] as T,
        };

      case 'get_filesystem_state':
        return {
          success: true,
          data: {
            active_watchers: [],
            active_locks: [],
            pending_events: 0,
            events_per_second: 0,
            last_updated: new Date().toISOString(),
          } as T,
        };

      case 'path_exists':
        return {
          success: true,
          data: false as T,
        };

      case 'get_file_size':
        return {
          success: true,
          data: 0 as T,
        };

      case 'get_file_metadata':
        return {
          success: true,
          data: {
            size: 1024,
            created: '2024-01-01T00:00:00Z',
            modified: '2024-01-01T00:00:00Z',
            is_directory: false,
            is_hidden: false,
            mime_type: 'text/plain',
          } as T,
        };

      case 'list_directory':
        return {
          success: true,
          data: ['file1.txt', 'file2.txt'] as T,
        };

      case 'create_directory':
      case 'delete_path':
        return {
          success: true,
          data: undefined as T,
        };

      case 'clear_pending_events':
        return {
          success: true,
          data: undefined as T,
        };

      case 'get_active_locks':
        return {
          success: true,
          data: [] as T,
        };

      case 'list_active_watchers':
        return {
          success: true,
          data: [] as T,
        };

      case 'get_watcher_stats':
        return {
          success: true,
          data: null as T,
        };

      default:
        return {
          success: false,
          error: FilesystemError.WatcherError,
          message: `Mock not implemented for command: ${command}`,
        };
    }
  }

  /**
   * Démarre un watcher sur un chemin
   */
  async startWatcher(config: WatcherConfig): Promise<FilesystemResult<string>> {
    const errors = validateWatcherConfig(config);
    if (errors.length > 0) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: errors.join(', '),
      };
    }

    const result = await this.invokeCommand<string>('start_watcher', { config });

    if (result.success) {
      this.notifyListeners('watcher_started', {
        watcher_id: result.data,
        path: config.path,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Arrête un watcher
   */
  async stopWatcher(watcherId: string): Promise<FilesystemResult<void>> {
    const result = await this.invokeCommand<void>('stop_watcher', { watcherId });

    if (result.success) {
      this.notifyListeners('watcher_stopped', {
        watcher_id: watcherId,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Acquiert un verrou sur un fichier
   */
  async acquireLock(path: string, options: AcquireLockOptions): Promise<FilesystemResult<string>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    const errors = validateLockOptions(options);
    if (errors.length > 0) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: errors.join(', '),
      };
    }

    const result = await this.invokeCommand<string>('acquire_lock', {
      path,
      lock_type: options.lock_type,
      timeout_ms: options.timeout,
    });

    if (result.success) {
      this.notifyListeners('lock_acquired', {
        lock_id: result.data,
        path,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Libère un verrou
   */
  async releaseLock(lockId: string): Promise<FilesystemResult<void>> {
    const result = await this.invokeCommand<void>('release_lock', { lockId });

    if (result.success) {
      this.notifyListeners('lock_released', {
        lock_id: lockId,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Récupère les événements en attente
   */
  async getPendingEvents(limit?: number): Promise<FilesystemResult<FileEvent[]>> {
    return this.invokeCommand<FileEvent[]>('get_pending_events', { limit });
  }

  /**
   * Vide les événements en attente
   */
  async clearPendingEvents(): Promise<FilesystemResult<void>> {
    return this.invokeCommand<void>('clear_pending_events');
  }

  /**
   * Récupère l'état actuel du service
   */
  async getFilesystemState(): Promise<FilesystemResult<FilesystemState>> {
    return this.invokeCommand<FilesystemState>('get_filesystem_state');
  }

  /**
   * Récupère la liste des verrous actifs
   */
  async getActiveLocks(): Promise<FilesystemResult<FileLock[]>> {
    return this.invokeCommand<FileLock[]>('get_active_locks');
  }

  /**
   * Vérifie si un fichier est verrouillé
   */
  async isFileLocked(path: string): Promise<FilesystemResult<boolean>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<boolean>('is_file_locked', { path });
  }

  /**
   * Récupère les statistiques d'un watcher
   */
  async getWatcherStats(watcherId: string): Promise<FilesystemResult<WatcherStats | null>> {
    return this.invokeCommand<WatcherStats | null>('get_watcher_stats', { watcherId });
  }

  /**
   * Liste tous les watchers actifs
   */
  async listActiveWatchers(): Promise<FilesystemResult<WatcherStats[]>> {
    return this.invokeCommand<WatcherStats[]>('list_active_watchers');
  }

  /**
   * Test de permission sur un chemin
   */
  async testPermissions(path: string): Promise<FilesystemResult<boolean>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<boolean>('test_permissions', { path });
  }

  /**
   * Récupère les métadonnées d'un fichier
   */
  async getFileMetadata(path: string): Promise<FilesystemResult<FileMetadata>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<FileMetadata>('get_file_metadata', { path });
  }

  /**
   * Crée un dossier
   */
  async createDirectory(path: string): Promise<FilesystemResult<void>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<void>('create_directory', { path });
  }

  /**
   * Supprime un fichier ou dossier
   */
  async deletePath(path: string): Promise<FilesystemResult<void>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<void>('delete_path', { path });
  }

  /**
   * Déplace un fichier ou dossier
   */
  async movePath(from: string, to: string): Promise<FilesystemResult<void>> {
    if (!isValidPath(from) || !isValidPath(to)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<void>('move_path', { from, to });
  }

  /**
   * Copie un fichier
   */
  async copyFile(from: string, to: string): Promise<FilesystemResult<void>> {
    if (!isValidPath(from) || !isValidPath(to)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<void>('copy_file', { from, to });
  }

  /**
   * Liste le contenu d'un dossier
   */
  async listDirectory(
    path: string,
    options?: ListDirectoryOptions,
  ): Promise<FilesystemResult<string[]>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<string[]>('list_directory', {
      path,
      recursive: options?.recursive,
    });
  }

  /**
   * Vérifie l'existence d'un chemin
   */
  async pathExists(path: string): Promise<FilesystemResult<boolean>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<boolean>('path_exists', { path });
  }

  /**
   * Récupère la taille d'un fichier
   */
  async getFileSize(path: string): Promise<FilesystemResult<number>> {
    if (!isValidPath(path)) {
      return {
        success: false,
        error: FilesystemError.InvalidPath,
        message: 'Invalid path',
      };
    }

    return this.invokeCommand<number>('get_file_size', { path });
  }

  /**
   * Ajoute un écouteur d'événements de monitoring
   */
  addEventListener(
    eventType: string,
    callback: (event: FilesystemMonitoringEvent) => void,
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }

    // Retourne une fonction pour désinscrire
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Notifie tous les écouteurs d'un événement
   */
  private notifyListeners(
    type: FilesystemMonitoringEvent['type'],
    data: Omit<FilesystemMonitoringEvent['data'], 'type'>,
  ): void {
    const event: FilesystemMonitoringEvent = {
      type,
      data: {
        ...data,
        timestamp: data.timestamp ?? new Date().toISOString(),
      },
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((callback: (event: FilesystemMonitoringEvent) => void) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in filesystem event listener:', error);
        }
      });
    }
  }

  /**
   * Nettoie tous les écouteurs
   */
  cleanup(): void {
    this.eventListeners.clear();
  }

  /**
   * Vérifie la disponibilité du service
   */
  async isAvailable(): Promise<boolean> {
    return this.checkTauriAvailability();
  }

  /**
   * Récupère des informations de diagnostic
   */
  async getDiagnostics(): Promise<{
    tauri_available: boolean;
    active_listeners: number;
    last_check: string;
  }> {
    return {
      tauri_available: await this.checkTauriAvailability(),
      active_listeners: Array.from(this.eventListeners.values()).reduce(
        (total, set) => total + set.size,
        0,
      ),
      last_check: new Date().toISOString(),
    };
  }
}

/**
 * Instance singleton exportée
 */
export const filesystemService = FilesystemService.getInstance();

/**
 * Fonctions utilitaires exportées pour faciliter l'utilisation
 */

/**
 * Crée une configuration de watcher par défaut
 */
export function createDefaultWatcherConfig(path: string): WatcherConfig {
  return {
    path,
    recursive: true,
    watch_events: [FileEventType.Created, FileEventType.Modified, FileEventType.Deleted],
    extensions_filter: ['jpg', 'jpeg', 'cr3', 'raf', 'arw', 'png', 'tiff'],
    pattern_filter: undefined,
    ignore_hidden: true,
    debounce_timeout: 500,
    max_file_size: 100 * 1024 * 1024, // 100MB
  };
}

/**
 * Crée des options de verrou par défaut
 */
export function createDefaultLockOptions(
  type: FileLockType = FileLockType.Exclusive,
): AcquireLockOptions {
  return {
    lock_type: type,
    timeout: 30000, // 30 secondes
  };
}

/**
 * Formate la taille d'un fichier
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Formate la durée depuis un timestamp
 */
export function formatDuration(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

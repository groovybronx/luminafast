/**
 * Types TypeScript pour le service filesystem
 * Correspond aux types Rust dans src-tauri/src/models/filesystem.rs
 */

/**
 * Types d'événements filesystem
 */
export enum FileEventType {
  Created = 'created',
  Modified = 'modified',
  Deleted = 'deleted',
  Renamed = 'renamed',
  DirectoryCreated = 'directory_created',
  DirectoryDeleted = 'directory_deleted',
  Error = 'error',
}

/**
 * Métadonnées d'événement
 */
export interface FileEventMetadata {
  /** Permissions du fichier */
  permissions?: number;
  /** Est-ce un dossier ? */
  is_directory: boolean;
  /** Est-ce un fichier caché ? */
  is_hidden: boolean;
  /** Extension du fichier */
  extension?: string;
  /** Hash BLAKE3 (si disponible) */
  blake3_hash?: string;
}

/**
 * Événement filesystem avec métadonnées
 */
export interface FileEvent {
  /** ID unique de l'événement */
  id: string;
  /** Type d'événement */
  event_type: FileEventType;
  /** Chemin du fichier concerné */
  path: string;
  /** Timestamp de l'événement (ISO 8601) */
  timestamp: string;
  /** Taille du fichier (si applicable) */
  size?: number;
  /** Type MIME (si détecté) */
  mime_type?: string;
  /** Métadonnées supplémentaires */
  metadata: FileEventMetadata;
}

/**
 * Types de verrous fichiers
 */
export enum FileLockType {
  Shared = 'shared',
  Exclusive = 'exclusive',
  Write = 'write',
}

/**
 * Information sur un verrou fichier
 */
export interface FileLock {
  /** ID unique du verrou */
  id: string;
  /** Chemin du fichier verrouillé */
  path: string;
  /** Type de verrou */
  lock_type: FileLockType;
  /** ID du processus qui possède le verrou */
  process_id: number;
  /** Timestamp de création du verrou (ISO 8601) */
  created_at: string;
  /** Timeout du verrou (ms) */
  timeout?: number;
  /** Est-ce un verrou hérité ? */
  inherited: boolean;
}

/**
 * Configuration du watcher filesystem
 */
export interface WatcherConfig {
  /** Chemin à surveiller */
  path: string;
  /** Surveillance récursive des sous-dossiers ? */
  recursive: boolean;
  /** Types d'événements à surveiller */
  watch_events: FileEventType[];
  /** Filtres par extension (ex: ["jpg", "cr3", "raf"]) */
  extensions_filter?: string[];
  /** Filtres par pattern (ex: ["IMG_*", "DSC_*"]) */
  pattern_filter?: string[];
  /** Ignorer les dossiers cachés ? */
  ignore_hidden: boolean;
  /** Debouncing timeout en ms */
  debounce_timeout: number;
  /** Taille maximale des fichiers à traiter */
  max_file_size?: number;
}

/**
 * Statistiques du watcher
 */
export interface WatcherStats {
  /** ID du watcher */
  watcher_id: string;
  /** Chemin surveillé */
  path: string;
  /** Nombre d'événements traités */
  events_processed: number;
  /** Nombre d'erreurs */
  errors: number;
  /** Timestamp de début (ISO 8601) */
  started_at: string;
  /** Timestamp du dernier événement (ISO 8601) */
  last_event_at?: string;
  /** Nombre de fichiers surveillés */
  files_watched: number;
  /** Nombre de dossiers surveillés */
  directories_watched: number;
  /** Mémoire utilisée (bytes) */
  memory_usage: number;
}

/**
 * État du service filesystem
 */
export interface FilesystemState {
  /** Watchers actifs */
  active_watchers: WatcherStats[];
  /** Verrous actifs */
  active_locks: FileLock[];
  /** Queue d'événements en attente */
  pending_events: number;
  /** Événements traités par seconde */
  events_per_second: number;
  /** Timestamp de dernière mise à jour (ISO 8601) */
  last_updated: string;
}

/**
 * Erreurs filesystem
 */
export enum FilesystemError {
  PermissionDenied = 'PermissionDenied',
  FileNotFound = 'FileNotFound',
  LockAlreadyAcquired = 'LockAlreadyAcquired',
  LockTimeout = 'LockTimeout',
  IoError = 'IoError',
  WatcherError = 'WatcherError',
  InvalidPath = 'InvalidPath',
  FileTooLarge = 'FileTooLarge',
  MimeError = 'MimeError',
}

/**
 * Résultat d'opération filesystem
 */
export type FilesystemResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: FilesystemError;
  message: string;
};

/**
 * Options pour l'acquisition de verrou
 */
export interface AcquireLockOptions {
  /** Type de verrou */
  lock_type: FileLockType;
  /** Timeout en ms (optionnel) */
  timeout?: number;
}

/**
 * Options pour le listing de dossier
 */
export interface ListDirectoryOptions {
  /** Surveillance récursive ? */
  recursive?: boolean;
  /** Filtre par extension */
  extensions_filter?: string[];
  /** Inclure les fichiers cachés ? */
  include_hidden?: boolean;
}

/**
 * Métadonnées de fichier (version simplifiée)
 */
export interface FileMetadata {
  /** Taille du fichier */
  size: number;
  /** Est-ce un dossier ? */
  is_directory: boolean;
  /** Est-ce un fichier caché ? */
  is_hidden: boolean;
  /** Extension du fichier */
  extension?: string;
  /** Type MIME */
  mime_type?: string;
  /** Timestamp de création (ISO 8601) */
  created_at?: string;
  /** Timestamp de modification (ISO 8601) */
  modified_at?: string;
  /** Permissions */
  permissions?: number;
}

/**
 * Événements de monitoring pour le frontend
 */
export interface FilesystemMonitoringEvent {
  /** Type d'événement de monitoring */
  type: 'watcher_started' | 'watcher_stopped' | 'lock_acquired' | 'lock_released' | 'error';
  /** Données de l'événement */
  data: {
    watcher_id?: string;
    lock_id?: string;
    path?: string;
    error?: string;
    timestamp: string;
  };
}

/**
 * Configuration du service filesystem
 */
export interface FilesystemServiceConfig {
  /** Nombre maximum de watchers simultanés */
  max_watchers: number;
  /** Taille maximum de la queue d'événements */
  max_event_queue_size: number;
  /** Timeout par défaut pour les verrous (ms) */
  default_lock_timeout: number;
  /** Intervalle de nettoyage des verrous expirés (ms) */
  lock_cleanup_interval: number;
}

/**
 * Statistiques détaillées du service
 */
export interface FilesystemServiceStats {
  /** État actuel */
  state: FilesystemState;
  /** Configuration */
  config: FilesystemServiceConfig;
  /** Uptime du service (ms) */
  uptime: number;
  /** Mémoire totale utilisée (bytes) */
  total_memory_usage: number;
  /** Performance */
  performance: {
    /** Événements par seconde (moyenne sur 1 min) */
    events_per_second_1min: number;
    /** Événements par seconde (moyenne sur 5 min) */
    events_per_second_5min: number;
    /** Latence moyenne des événements (ms) */
    average_event_latency: number;
  };
}

/**
 * Validation des types
 */

/**
 * Valide qu'une chaîne est un chemin valide
 */
export function isValidPath(path: string): boolean {
  if (!path || path.trim().length === 0) return false;
  
  // Validation basique pour Phase 1.4
  // TODO: Implémenter validation plus robuste
  return !path.includes('..') && !path.includes('\0');
}

/**
 * Valide une configuration de watcher
 */
export function validateWatcherConfig(config: WatcherConfig): string[] {
  const errors: string[] = [];
  
  if (!isValidPath(config.path)) {
    errors.push('Invalid path');
  }
  
  if (config.debounce_timeout < 0) {
    errors.push('Debounce timeout must be positive');
  }
  
  if (config.max_file_size && config.max_file_size <= 0) {
    errors.push('Max file size must be positive');
  }
  
  if (config.watch_events.length === 0) {
    errors.push('At least one event type must be specified');
  }
  
  return errors;
}

/**
 * Valide des options de verrou
 */
export function validateLockOptions(options: AcquireLockOptions): string[] {
  const errors: string[] = [];
  
  if (!Object.values(FileLockType).includes(options.lock_type)) {
    errors.push('Invalid lock type');
  }
  
  if (options.timeout && options.timeout <= 0) {
    errors.push('Timeout must be positive');
  }
  
  return errors;
}

/**
 * Convertit un événement filesystem vers un format lisible
 */
export function formatFileEvent(event: FileEvent): string {
  const fileName = event.path.split('/').pop() || event.path;
  const action = event.event_type.replace('_', ' ');
  return `${action}: ${fileName}`;
}

/**
 * Vérifie si un événement concerne un fichier image
 */
export function isImageEvent(event: FileEvent): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif', 'cr3', 'raf', 'arw'];
  const extension = event.metadata.extension?.toLowerCase();
  return extension ? imageExtensions.includes(extension) : false;
}

/**
 * Vérifie si un événement concerne un fichier vidéo
 */
export function isVideoEvent(event: FileEvent): boolean {
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv'];
  const extension = event.metadata.extension?.toLowerCase();
  return extension ? videoExtensions.includes(extension) : false;
}

/**
 * Filtre les événements par type de fichier
 */
export function filterEventsByType<T extends FileEvent>(
  events: T[],
  filter: 'image' | 'video' | 'document' | 'all'
): T[] {
  switch (filter) {
    case 'image':
      return events.filter(isImageEvent) as T[];
    case 'video':
      return events.filter(isVideoEvent) as T[];
    case 'document':
      return events.filter(event => {
        const extension = event.metadata.extension?.toLowerCase();
        const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
        return extension ? docExtensions.includes(extension) : false;
      }) as T[];
    case 'all':
    default:
      return events;
  }
}

/**
 * Trie les événements par timestamp
 */
export function sortEventsByTimestamp<T extends FileEvent>(
  events: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Groupe les événements par type
 */
export function groupEventsByType<T extends FileEvent>(
  events: T[]
): Record<FileEventType, T[]> {
  const groups = {} as Record<FileEventType, T[]>;
  
  // Initialisation de tous les types
  Object.values(FileEventType).forEach(type => {
    groups[type] = [];
  });
  
  // Groupement
  events.forEach(event => {
    groups[event.event_type].push(event);
  });
  
  return groups;
}

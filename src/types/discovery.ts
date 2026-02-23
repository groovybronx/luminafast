/**
 * Discovery and Ingestion Types for LuminaFast
 *
 * This file contains TypeScript types that mirror the Rust discovery models
 * for seamless communication between frontend and backend.
 */

// ============================================================================
// RAW Format Types
// ============================================================================

/** Supported image file formats (RAW + standard formats) */
export enum RawFormat {
  // Canon formats
  CR3 = 'cr3', // Canon RAW 3 (newer)
  CR2 = 'cr2', // Canon RAW 2 (older)
  // Nikon formats
  NEF = 'nef', // Nikon Electronic Format
  // Sony formats
  ARW = 'arw', // Sony Alpha RAW
  // Fujifilm formats
  RAF = 'raf', // Fujifilm RAW
  // Olympus formats
  ORF = 'orf', // Olympus RAW Format
  // Pentax formats
  PEF = 'pef', // Pentax Electronic Format
  // Panasonic formats
  RW2 = 'rw2', // Panasonic RAW 2
  // Adobe DNG (universal RAW)
  DNG = 'dng', // Adobe Digital Negative
  // Standard image formats
  JPG = 'jpg', // JPEG
  JPEG = 'jpeg', // JPEG (alternate extension)
  PNG = 'png', // Portable Network Graphics
  WEBP = 'webp', // WebP
}

/** RAW format metadata */
export interface RawFormatInfo {
  /** Format identifier */
  format: RawFormat;
  /** File extension */
  extension: string;
  /** MIME type */
  mimeType: string;
  /** Format description */
  description: string;
  /** Signature bytes for file detection */
  signature: number[];
  /** Minimum file size in bytes */
  minSize: number;
  /** Maximum file size in bytes */
  maxSize: number;
}

// ============================================================================
// Discovery Configuration
// ============================================================================

/** Discovery scan configuration */
export interface DiscoveryConfig {
  /** Root directory to scan */
  rootPath: string;
  /** Enable recursive scanning */
  recursive: boolean;
  /** Supported RAW formats to scan for */
  formats: RawFormat[];
  /** Directory patterns to exclude */
  excludeDirs: string[];
  /** Maximum scan depth (null = unlimited) */
  maxDepth: number | null;
  /** Maximum number of files to discover (null = unlimited) */
  maxFiles: number | null;
}

/** Default discovery configuration */
export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  rootPath: '',
  recursive: true,
  formats: [
    // RAW formats (Phase 2.3 compliance)
    RawFormat.CR3,
    RawFormat.CR2, // Canon
    RawFormat.NEF, // Nikon
    RawFormat.ARW, // Sony
    RawFormat.RAF, // Fujifilm
    RawFormat.ORF, // Olympus
    RawFormat.PEF, // Pentax
    RawFormat.RW2, // Panasonic
    RawFormat.DNG, // Adobe
    // Standard formats
    RawFormat.JPG,
    RawFormat.JPEG, // JPEG
    RawFormat.PNG, // PNG
    RawFormat.WEBP, // WebP
  ],
  excludeDirs: [
    '.DS_Store',
    '.git',
    '.svn',
    '.hg',
    'node_modules',
    '.vscode',
    '.idea',
    'Thumbs.db',
    'Desktop.ini',
  ],
  maxDepth: null,
  maxFiles: null,
};

// ============================================================================
// Discovery Session
// ============================================================================

/** Discovery session status */
export enum DiscoveryStatus {
  IDLE = 'idle',
  SCANNING = 'scanning',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  STOPPED = 'stopped',
}

/** Discovery session information */
export interface DiscoverySession {
  /** Unique session identifier */
  sessionId: string;
  /** Session configuration */
  config: DiscoveryConfig;
  /** Current session status */
  status: DiscoveryStatus;
  /** Total files found so far */
  filesFound: number;
  /** Total files processed */
  filesProcessed: number;
  /** Number of files with errors */
  filesWithErrors: number;
  /** Progress percentage (0.0 - 1.0) */
  progressPercentage: number;
  /** Currently scanning directory */
  currentDirectory: string | null;
  /** Session start timestamp */
  startedAt: string;
  /** Session completion timestamp */
  completedAt: string | null;
  /** Error message if status is ERROR */
  errorMessage: string | null;
}

/** Session duration information */
export interface SessionDuration {
  /** Total duration in milliseconds */
  totalMs: number;
  /** Formatted duration string */
  formatted: string;
  /** Duration in seconds */
  seconds: number;
  /** Duration in minutes */
  minutes: number;
  /** Duration in hours */
  hours: number;
}

// ============================================================================
// Discovered Files
// ============================================================================

/** Discovered file information */
export interface DiscoveredFile {
  /** Unique file identifier */
  id: string;
  /** Session identifier */
  sessionId: string;
  /** File path */
  path: string;
  /** File name */
  filename: string;
  /** File size in bytes */
  sizeBytes: number;
  /** RAW format */
  format: RawFormat;
  /** File modification timestamp */
  modifiedAt: string;
  /** File creation timestamp */
  createdAt: string;
  /** File processing status */
  status: FileProcessingStatus;
  /** BLAKE3 hash (if computed) */
  blake3Hash: string | null;
  /** Error message (if processing failed) */
  errorMessage: string | null;
  /** Ingestion timestamp */
  ingestedAt: string | null;
  /** Database record ID (if ingested) */
  databaseId: number | null;
}

/** File processing status */
export enum FileProcessingStatus {
  DISCOVERED = 'discovered',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error',
  SKIPPED = 'skipped',
}

// ============================================================================
// Ingestion Types
// ============================================================================

/** Basic EXIF metadata */
export interface BasicExif {
  /** Camera manufacturer */
  make: string | null;
  /** Camera model */
  model: string | null;
  /** Date/time photo was taken */
  dateTaken: string | null;
  /** ISO sensitivity */
  iso: number | null;
  /** Aperture value (f-stop) */
  aperture: number | null;
  /** Shutter speed */
  shutterSpeed: string | null;
  /** Focal length in mm */
  focalLength: number | null;
  /** Lens information */
  lens: string | null;
}

/** Format-specific details */
export interface FormatDetails {
  /** RAW format */
  format: RawFormat;
  /** Whether file signature is valid */
  signatureValid: boolean;
  /** Format-specific metadata */
  formatMetadata: Record<string, unknown> | null;
}

/** Ingestion metadata */
export interface IngestionMetadata {
  /** BLAKE3 hash */
  blake3Hash: string;
  /** Basic EXIF data */
  exif: BasicExif;
  /** Format details */
  formatDetails: FormatDetails;
}

/** Ingestion result */
export interface IngestionResult {
  /** Discovered file */
  file: DiscoveredFile;
  /** Whether ingestion succeeded */
  success: boolean;
  /** Database record ID */
  databaseId: number | null;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error message (if failed) */
  error: string | null;
  /** Ingestion metadata */
  metadata: IngestionMetadata | null;
}

/** Ingestion progress event (real-time updates during batch ingestion) */
export interface IngestionProgress {
  /** Session ID */
  sessionId: string;
  /** Total files to ingest */
  total: number;
  /** Files processed so far */
  processed: number;
  /** Number of successful ingestions */
  successful: number;
  /** Number of failed ingestions */
  failed: number;
  /** Number of skipped files */
  skipped: number;
  /** Current file being processed */
  currentFile: string | null;
  /** Progress percentage (0.0 - 1.0) */
  percentage: number;
}

// ============================================================================
// Batch Ingestion
// ============================================================================

/** Batch ingestion request */
export interface BatchIngestionRequest {
  /** Session identifier */
  sessionId: string;
  /** Specific file paths to ingest (empty = all discovered files) */
  filePaths: string[];
  /** Skip already ingested files */
  skipExisting: boolean;
  /** Maximum number of files to ingest (null = all) */
  maxFiles: number | null;
}

/** Batch ingestion result */
export interface BatchIngestionResult {
  /** Session identifier */
  sessionId: string;
  /** Total files requested */
  totalRequested: number;
  /** Successfully ingested files */
  successful: IngestionResult[];
  /** Failed files */
  failed: IngestionResult[];
  /** Skipped files */
  skipped: IngestionResult[];
  /** Total processing time in milliseconds */
  totalProcessingTimeMs: number;
  /** Average processing time per file */
  avgProcessingTimeMs: number;
  /** Success rate (0.0 - 1.0) */
  successRate: number;
}

// ============================================================================
// Statistics
// ============================================================================

/** Discovery statistics */
export interface DiscoveryStats {
  /** Session identifier */
  sessionId: string;
  /** Session status */
  status: DiscoveryStatus;
  /** Files found */
  filesFound: number;
  /** Files processed */
  filesProcessed: number;
  /** Files with errors */
  filesWithErrors: number;
  /** Progress percentage */
  progressPercentage: number;
  /** Current directory */
  currentDirectory: string | null;
  /** Session start time */
  startedAt: string;
  /** Session completion time */
  completedAt: string | null;
  /** Session duration */
  duration: SessionDuration | null;
  /** Ingestion statistics */
  ingestionStats: IngestionStats;
}

/** Ingestion statistics */
export interface IngestionStats {
  /** Session identifier */
  sessionId: string;
  /** Total files */
  totalFiles: number;
  /** Ingested files */
  ingestedFiles: number;
  /** Failed files */
  failedFiles: number;
  /** Skipped files */
  skippedFiles: number;
  /** Total size in bytes */
  totalSizeBytes: number;
  /** Average processing time in milliseconds */
  avgProcessingTimeMs: number;
}

// ============================================================================
// Error Types
// ============================================================================

/** Discovery error types */
export enum DiscoveryErrorType {
  /** Invalid file path */
  INVALID_PATH = 'invalid_path',
  /** File system I/O error */
  IO_ERROR = 'io_error',
  /** Database error */
  DATABASE_ERROR = 'database_error',
  /** Hashing error */
  HASHING_ERROR = 'hashing_error',
  /** EXIF extraction error */
  EXIF_ERROR = 'exif_error',
  /** Configuration error */
  CONFIG_ERROR = 'config_error',
  /** Permission error */
  PERMISSION_ERROR = 'permission_error',
  /** Network error (for remote paths) */
  NETWORK_ERROR = 'network_error',
  /** Unknown error */
  UNKNOWN_ERROR = 'unknown_error',
}

/** Discovery error */
export interface DiscoveryError {
  /** Error type */
  type: DiscoveryErrorType;
  /** Error message */
  message: string;
  /** File path (if applicable) */
  path: string | null;
  /** Session identifier (if applicable) */
  sessionId: string | null;
  /** Timestamp */
  timestamp: string;
  /** Stack trace (for debugging) */
  stack: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Discovery event types */
export enum DiscoveryEventType {
  SESSION_STARTED = 'session_started',
  SESSION_STOPPED = 'session_stopped',
  SESSION_PAUSED = 'session_paused',
  SESSION_RESUMED = 'session_resumed',
  SESSION_COMPLETED = 'session_completed',
  SESSION_ERROR = 'session_error',
  FILE_DISCOVERED = 'file_discovered',
  FILE_PROCESSED = 'file_processed',
  FILE_ERROR = 'file_error',
  PROGRESS_UPDATED = 'progress_updated',
}

/** Discovery event */
export interface DiscoveryEvent {
  /** Event type */
  type: DiscoveryEventType;
  /** Session identifier */
  sessionId: string;
  /** Timestamp */
  timestamp: string;
  /** Event data */
  data: Record<string, unknown>;
}

/** Discovery progress */
export interface DiscoveryProgress {
  /** Session identifier */
  sessionId: string;
  /** Current progress percentage */
  percentage: number;
  /** Files processed */
  processed: number;
  /** Total files */
  total: number;
  /** Current directory */
  currentDirectory: string | null;
  /** Estimated time remaining in seconds */
  etaSeconds: number | null;
  /** Processing rate in files per second */
  processingRate: number | null;
}

// ============================================================================
// Validation Types
// ============================================================================

/** Path validation result */
export interface PathValidationResult {
  /** Whether path is valid */
  valid: boolean;
  /** Path type */
  type: 'directory' | 'file' | 'nonexistent';
  /** Readable */
  readable: boolean;
  /** Writable */
  writable: boolean;
  /** Error message (if invalid) */
  error: string | null;
}

/** Configuration validation result */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/** Type guard for RawFormat */
export function isRawFormat(value: string): value is RawFormat {
  return Object.values(RawFormat).includes(value as RawFormat);
}

/** Type guard for DiscoveryStatus */
export function isDiscoveryStatus(value: string): value is DiscoveryStatus {
  return Object.values(DiscoveryStatus).includes(value as DiscoveryStatus);
}

/** Type guard for FileProcessingStatus */
export function isFileProcessingStatus(value: string): value is FileProcessingStatus {
  return Object.values(FileProcessingStatus).includes(value as FileProcessingStatus);
}

/** Get format information for a RAW format */
export function getRawFormatInfo(format: RawFormat): RawFormatInfo {
  const formatMap: Record<RawFormat, RawFormatInfo> = {
    // Canon formats
    [RawFormat.CR3]: {
      format: RawFormat.CR3,
      extension: 'cr3',
      mimeType: 'image/x-canon-cr3',
      description: 'Canon RAW 3',
      signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp box
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    [RawFormat.CR2]: {
      format: RawFormat.CR2,
      extension: 'cr2',
      mimeType: 'image/x-canon-cr2',
      description: 'Canon RAW 2',
      signature: [0x49, 0x49, 0x2a, 0x00], // TIFF LE
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Nikon formats
    [RawFormat.NEF]: {
      format: RawFormat.NEF,
      extension: 'nef',
      mimeType: 'image/x-nikon-nef',
      description: 'Nikon Electronic Format',
      signature: [0x49, 0x49, 0x2a, 0x00], // TIFF LE
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Sony formats
    [RawFormat.ARW]: {
      format: RawFormat.ARW,
      extension: 'arw',
      mimeType: 'image/x-sony-arw',
      description: 'Sony Alpha RAW',
      signature: [0x49, 0x49, 0x2a, 0x00], // TIFF LE
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Fujifilm formats
    [RawFormat.RAF]: {
      format: RawFormat.RAF,
      extension: 'raf',
      mimeType: 'image/x-fuji-raf',
      description: 'Fujifilm RAW',
      signature: [0x46, 0x55, 0x4a, 0x49, 0x46, 0x49, 0x4c, 0x4d], // FUJIFILM
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Olympus formats
    [RawFormat.ORF]: {
      format: RawFormat.ORF,
      extension: 'orf',
      mimeType: 'image/x-olympus-orf',
      description: 'Olympus RAW Format',
      signature: [0x49, 0x49, 0x52, 0x4f], // IIRO
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Pentax formats
    [RawFormat.PEF]: {
      format: RawFormat.PEF,
      extension: 'pef',
      mimeType: 'image/x-pentax-pef',
      description: 'Pentax Electronic Format',
      signature: [0x49, 0x49, 0x2a, 0x00], // TIFF LE
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Panasonic formats
    [RawFormat.RW2]: {
      format: RawFormat.RW2,
      extension: 'rw2',
      mimeType: 'image/x-panasonic-rw2',
      description: 'Panasonic RAW 2',
      signature: [0x49, 0x49, 0x55, 0x00], // IIU\0
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Adobe DNG
    [RawFormat.DNG]: {
      format: RawFormat.DNG,
      extension: 'dng',
      mimeType: 'image/x-adobe-dng',
      description: 'Adobe Digital Negative',
      signature: [0x49, 0x49, 0x2a, 0x00], // TIFF LE
      minSize: 1024 * 1024, // 1MB
      maxSize: 1024 * 1024 * 1024, // 1GB
    },
    // Standard formats
    [RawFormat.JPG]: {
      format: RawFormat.JPG,
      extension: 'jpg',
      mimeType: 'image/jpeg',
      description: 'JPEG',
      signature: [0xff, 0xd8, 0xff],
      minSize: 1024, // 1KB
      maxSize: 100 * 1024 * 1024, // 100MB
    },
    [RawFormat.JPEG]: {
      format: RawFormat.JPEG,
      extension: 'jpeg',
      mimeType: 'image/jpeg',
      description: 'JPEG',
      signature: [0xff, 0xd8, 0xff],
      minSize: 1024, // 1KB
      maxSize: 100 * 1024 * 1024, // 100MB
    },
    [RawFormat.PNG]: {
      format: RawFormat.PNG,
      extension: 'png',
      mimeType: 'image/png',
      description: 'PNG',
      signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      minSize: 1024, // 1KB
      maxSize: 100 * 1024 * 1024, // 100MB
    },
    [RawFormat.WEBP]: {
      format: RawFormat.WEBP,
      extension: 'webp',
      mimeType: 'image/webp',
      description: 'WebP',
      signature: [0x52, 0x49, 0x46, 0x46], // RIFF
      minSize: 1024, // 1KB
      maxSize: 100 * 1024 * 1024, // 100MB
    },
  };

  return formatMap[format];
}

/** Format file size for display */
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

/** Format duration for display */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/** Calculate session duration */
export function calculateSessionDuration(session: DiscoverySession): SessionDuration | null {
  if (!session.completedAt) return null;

  const started = new Date(session.startedAt).getTime();
  const completed = new Date(session.completedAt).getTime();
  const totalMs = completed - started;

  return {
    totalMs,
    formatted: formatDuration(totalMs),
    seconds: Math.floor(totalMs / 1000),
    minutes: Math.floor(totalMs / (1000 * 60)),
    hours: Math.floor(totalMs / (1000 * 60 * 60)),
  };
}

// ============================================================================
// Export Types
// ============================================================================

// All types are exported individually above

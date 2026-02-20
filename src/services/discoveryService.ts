/**
 * Discovery Service - Frontend wrapper for Rust discovery commands
 * 
 * This service provides a TypeScript interface to the Rust discovery functionality
 * with proper error handling, fallbacks, and type safety.
 */

import {
  DiscoveryStatus,
} from '../types/discovery';
import type {
  DiscoveryConfig,
  DiscoverySession,
  DiscoveredFile,
  IngestionResult,
  BatchIngestionRequest,
  BatchIngestionResult,
  DiscoveryStats,
  DiscoveryProgress,
  PathValidationResult,
  ConfigValidationResult,
} from '../types/discovery';

// ============================================================================
// Service Configuration
// ============================================================================

/** Service configuration */
interface DiscoveryServiceConfig {
  /** Enable debug logging (dev mode only) */
  debug: boolean;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
}

/** Default service configuration */
const DEFAULT_CONFIG: DiscoveryServiceConfig = {
  debug: false,
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// ============================================================================
// Error Types
// ============================================================================

/** Service error types */
export enum ServiceErrorType {
  /** Network/communication error */
  NETWORK_ERROR = 'network_error',
  /** Timeout error */
  TIMEOUT_ERROR = 'timeout_error',
  /** Invalid parameters */
  INVALID_PARAMS = 'invalid_params',
  /** Command not available */
  COMMAND_NOT_AVAILABLE = 'command_not_available',
  /** Permission denied */
  PERMISSION_DENIED = 'permission_denied',
  /** Service not initialized */
  SERVICE_NOT_INITIALIZED = 'service_not_initialized',
  /** Unknown error */
  UNKNOWN_ERROR = 'unknown_error',
}

/** Service error */
export class ServiceError extends Error {
  constructor(
    public type: ServiceErrorType,
    message: string,
    public originalError?: Error | unknown,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  /** Convert to JSON */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }

  /** Create from unknown error */
  static fromUnknown(error: unknown, context?: Record<string, unknown>): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }

    if (error instanceof Error) {
      return new ServiceError(
        ServiceErrorType.UNKNOWN_ERROR,
        error.message,
        error,
        context
      );
    }

    return new ServiceError(
      ServiceErrorType.UNKNOWN_ERROR,
      'Unknown error',
      undefined,
      context
    );
  }
}

// ============================================================================
// Discovery Service Class
// ============================================================================

/** Discovery service class */
export class DiscoveryService {
  private config: DiscoveryServiceConfig;
  private activeSessions: Map<string, DiscoverySession> = new Map();
  private eventListeners: Map<string, Set<(event: DiscoveryProgress) => void>> = new Map();

  constructor(config: Partial<DiscoveryServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log('Discovery service initialized', { config: this.config });
  }

  /**
   * Get Tauri invoke function (handle both __TAURI__ and __TAURI_INTERNALS__)
   */
  private static getInvoke() {
    if (typeof window !== 'undefined') {
      // Try __TAURI__ first (normal case)
      const tauriWindow = window as unknown as {
        __TAURI__?: { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
        __TAURI_INTERNALS__?: { invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown> };
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
      if (import.meta.env.DEV) {
        console.warn(`[DiscoveryService] Tauri not available, mocking command: ${command}`, { args });
      }
      throw new Error(`Tauri not available: ${command}`);
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /** Log debug messages (dev mode only) */
  private log(message: string, data?: unknown): void {
    if (this.config.debug && import.meta.env.DEV) {
      console.warn(`[DiscoveryService] ${message}`, data);
    }
  }

  /** Log error messages */
  private logError(message: string, error?: unknown): void {
    console.error(`[DiscoveryService] ${message}`, error);
  }

  /** Delay for retry */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Execute command with retry logic */
  private async executeCommand<T>(
    command: string,
    args?: Record<string, unknown>,
    retries = 0
  ): Promise<T> {
    try {
      this.log(`Executing command: ${command}`, { args, retries });
      
      const invoke = DiscoveryService.getInvoke();
      
      // Pass args directly as object for Tauri named arguments
      const result = await invoke(command, args) as T;
      
      this.log(`Command succeeded: ${command}`, { result });
      return result;
      
    } catch (error) {
      this.logError(`Command failed: ${command}`, error);
      
      // Check if we should retry
      if (retries < this.config.maxRetries && this.shouldRetry(error)) {
        this.log(`Retrying command: ${command}`, { retries: retries + 1 });
        await this.delay(this.config.retryDelay);
        return this.executeCommand<T>(command, args, retries + 1);
      }
      
      throw ServiceError.fromUnknown(error, { command, args, retries });
    }
  }

  /** Check if error is retryable */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Retry on network errors, timeouts, and temporary failures
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('temporary') ||
        message.includes('busy')
      );
    }
    
    return false;
  }

  /** Update local session cache */
  private updateSession(session: DiscoverySession): void {
    this.activeSessions.set(session.sessionId, session);
    this.emitProgress(session.sessionId);
  }

  /** Emit progress event */
  private emitProgress(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const listeners = this.eventListeners.get(sessionId);
    if (!listeners) return;

    const progress: DiscoveryProgress = {
      sessionId,
      percentage: session.progressPercentage,
      processed: session.filesProcessed,
      total: session.filesFound,
      currentDirectory: session.currentDirectory,
      etaSeconds: this.calculateETA(session),
      processingRate: this.calculateProcessingRate(session),
    };

    listeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        this.logError('Error in progress listener', error);
      }
    });
  }

  /** Calculate estimated time remaining */
  private calculateETA(session: DiscoverySession): number | null {
    if (session.progressPercentage <= 0 || session.status !== DiscoveryStatus.SCANNING) {
      return null;
    }

    const elapsed = Date.now() - new Date(session.startedAt).getTime();
    const estimatedTotal = elapsed / session.progressPercentage;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }

  /** Calculate processing rate */
  private calculateProcessingRate(session: DiscoverySession): number | null {
    if (session.status !== DiscoveryStatus.SCANNING) {
      return null;
    }

    const elapsed = Date.now() - new Date(session.startedAt).getTime();
    const elapsedSeconds = elapsed / 1000;

    if (elapsedSeconds <= 0) {
      return null;
    }

    return session.filesProcessed / elapsedSeconds;
  }

  // ============================================================================
  // Discovery Commands
  // ============================================================================

  /**
   * Start a new discovery session
   */
  async startDiscovery(config: DiscoveryConfig): Promise<DiscoverySession> {
    try {
      this.log('Starting discovery', { config });
      
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new ServiceError(
          ServiceErrorType.INVALID_PARAMS,
          'Invalid discovery configuration',
          undefined,
          { errors: validation.errors }
        );
      }

      const session = await this.executeCommand<DiscoverySession>(
        'start_discovery',
        { config }
      );

      this.updateSession(session);
      this.log('Discovery started', { sessionId: session.sessionId });
      
      return session;
      
    } catch (error) {
      this.logError('Failed to start discovery', error);
      throw error;
    }
  }

  /**
   * Stop an active discovery session
   */
  async stopDiscovery(sessionId: string): Promise<void> {
    try {
      this.log('Stopping discovery', { sessionId });
      
      await this.executeCommand<void>('stop_discovery', { sessionId });
      
      // Update local cache
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.status = DiscoveryStatus.STOPPED;
        session.completedAt = new Date().toISOString();
        this.updateSession(session);
      }
      
      this.log('Discovery stopped', { sessionId });
      
    } catch (error) {
      this.logError('Failed to stop discovery', error);
      throw error;
    }
  }

  /**
   * Get the status of a discovery session
   */
  async getDiscoveryStatus(sessionId: string): Promise<DiscoverySession> {
    try {
      this.log('Getting discovery status', { sessionId });
      
      const session = await this.executeCommand<DiscoverySession>(
        'get_discovery_status',
        { sessionId }
      );

      this.updateSession(session);
      return session;
      
    } catch (error) {
      this.logError('Failed to get discovery status', error);
      throw error;
    }
  }

  /**
   * Get all discovery sessions
   */
  async getAllDiscoverySessions(): Promise<DiscoverySession[]> {
    try {
      this.log('Getting all discovery sessions');
      
      const sessions = await this.executeCommand<DiscoverySession[]>(
        'get_all_discovery_sessions'
      );

      // Update local cache
      sessions.forEach(session => this.updateSession(session));
      
      return sessions;
      
    } catch (error) {
      this.logError('Failed to get all discovery sessions', error);
      throw error;
    }
  }

  /**
   * Get discovered files for a session
   */
  async getDiscoveredFiles(sessionId: string): Promise<DiscoveredFile[]> {
    try {
      this.log('Getting discovered files', { sessionId });
      
      const files = await this.executeCommand<DiscoveredFile[]>(
        'get_discovered_files',
        { sessionId }
      );

      this.log('Retrieved discovered files', { sessionId, count: files.length });
      return files;
      
    } catch (error) {
      this.logError('Failed to get discovered files', error);
      throw error;
    }
  }

  // ============================================================================
  // Ingestion Commands
  // ============================================================================

  /**
   * Ingest a single discovered file
   */
  async ingestFile(file: DiscoveredFile): Promise<IngestionResult> {
    try {
      this.log('Ingesting file', { fileId: file.id, filename: file.filename });
      
      const result = await this.executeCommand<IngestionResult>(
        'ingest_file',
        { file }
      );

      this.log('File ingested', { 
        fileId: file.id, 
        success: result.success,
        processingTime: result.processingTimeMs 
      });
      
      return result;
      
    } catch (error) {
      this.logError('Failed to ingest file', error);
      throw error;
    }
  }

  /**
   * Batch ingest multiple files
   */
  async batchIngest(request: BatchIngestionRequest): Promise<BatchIngestionResult> {
    try {
      this.log('Starting batch ingestion', { 
        sessionId: request.sessionId,
        fileCount: request.filePaths.length 
      });
      
      const result = await this.executeCommand<BatchIngestionResult>(
        'batch_ingest',
        { request }
      );

      this.log('Batch ingestion completed', {
        sessionId: request.sessionId,
        successRate: result.successRate,
        totalProcessed: result.successful.length + result.failed.length + result.skipped.length
      });
      
      return result;
      
    } catch (error) {
      this.logError('Failed to batch ingest', error);
      throw error;
    }
  }

  // ============================================================================
  // Utility Commands
  // ============================================================================

  /**
   * Create a discovery configuration from a directory path
   */
  async createDiscoveryConfig(
    rootPath: string,
    recursive?: boolean,
    maxDepth?: number,
    maxFiles?: number
  ): Promise<DiscoveryConfig> {
    try {
      this.log('Creating discovery config', { rootPath, recursive, maxDepth, maxFiles });
      
      // Try camelCase as suggested by the error message
      const args: Record<string, unknown> = {
        rootPath: rootPath,
        recursive: recursive,
        maxDepth: maxDepth,
        maxFiles: maxFiles
      };
      
      if (import.meta.env.DEV) {
        console.warn('DEBUG: Full args object:', JSON.stringify(args, null, 2));
      }
      this.log('Sending args to create_discovery_config', args);
      
      const config = await this.executeCommand<DiscoveryConfig>(
        'create_discovery_config',
        args
      );

      return config;
      
    } catch (error) {
      this.logError('Failed to create discovery config', error);
      throw error;
    }
  }

  /**
   * Get supported RAW formats
   */
  async getSupportedFormats(): Promise<string[]> {
    try {
      this.log('Getting supported formats');
      
      const formats = await this.executeCommand<string[]>('get_supported_formats');
      
      this.log('Retrieved supported formats', { formats });
      return formats;
      
    } catch (error) {
      this.logError('Failed to get supported formats', error);
      throw error;
    }
  }

  /**
   * Validate a directory path for discovery
   */
  async validateDiscoveryPath(path: string): Promise<PathValidationResult> {
    try {
      this.log('Validating discovery path', { path });
      
      const valid = await this.executeCommand<boolean>('validate_discovery_path', { path });
      
      const result: PathValidationResult = {
        valid,
        type: valid ? 'directory' : 'nonexistent',
        readable: valid,
        writable: false, // We don't check writability for discovery
        error: valid ? null : 'Path does not exist or is not accessible',
      };

      this.log('Path validation completed', { path, result });
      return result;
      
    } catch (error) {
      this.logError('Failed to validate path', error);
      throw error;
    }
  }

  /**
   * Get default discovery configuration
   */
  async getDefaultDiscoveryConfig(): Promise<DiscoveryConfig> {
    try {
      this.log('Getting default discovery config');
      
      const config = await this.executeCommand<DiscoveryConfig>(
        'get_default_discovery_config'
      );

      return config;
      
    } catch (error) {
      this.logError('Failed to get default discovery config', error);
      throw error;
    }
  }

  /**
   * Clean up old discovery sessions
   */
  async cleanupDiscoverySessions(maxAgeHours: number): Promise<number> {
    try {
      this.log('Cleaning up discovery sessions', { maxAgeHours });
      
      const cleaned = await this.executeCommand<number>(
        'cleanup_discovery_sessions',
        { max_age_hours: maxAgeHours }
      );

      this.log('Sessions cleaned up', { cleaned });
      return cleaned;
      
    } catch (error) {
      this.logError('Failed to cleanup sessions', error);
      throw error;
    }
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(sessionId: string): Promise<DiscoveryStats> {
    try {
      this.log('Getting discovery stats', { sessionId });
      
      const stats = await this.executeCommand<DiscoveryStats>(
        'get_discovery_stats',
        { sessionId }
      );

      this.log('Retrieved discovery stats', { sessionId });
      return stats;
      
    } catch (error) {
      this.logError('Failed to get discovery stats', error);
      throw error;
    }
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Validate discovery configuration
   */
  validateConfig(config: DiscoveryConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check root path
    if (!config.rootPath || config.rootPath.trim().length === 0) {
      errors.push('Root path is required');
    }

    // Check formats
    if (!config.formats || config.formats.length === 0) {
      errors.push('At least one format must be specified');
    }

    // Check max depth
    if (config.maxDepth !== null && config.maxDepth <= 0) {
      errors.push('Max depth must be greater than 0');
    }

    // Check max files
    if (config.maxFiles !== null && config.maxFiles <= 0) {
      errors.push('Max files must be greater than 0');
    }

    // Warnings
    if (config.maxFiles && config.maxFiles > 100000) {
      warnings.push('Large maxFiles limit may impact performance');
    }

    if (config.maxDepth && config.maxDepth > 50) {
      warnings.push('Deep recursion may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add progress event listener
   */
  addProgressListener(
    sessionId: string,
    listener: (progress: DiscoveryProgress) => void
  ): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }

    const listeners = this.eventListeners.get(sessionId);
    if (!listeners) {
      throw new ServiceError(
        ServiceErrorType.UNKNOWN_ERROR,
        'Session listeners not found',
        undefined,
        { sessionId }
      );
    }
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(sessionId);
      }
    };
  }

  /**
   * Remove all progress listeners for a session
   */
  removeProgressListeners(sessionId: string): void {
    this.eventListeners.delete(sessionId);
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get cached session
   */
  getSession(sessionId: string): DiscoverySession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all cached sessions
   */
  getAllSessions(): DiscoverySession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clear session cache
   */
  clearSessionCache(): void {
    this.activeSessions.clear();
    this.eventListeners.clear();
    this.log('Session cache cleared');
  }

  /**
   * Refresh session from backend
   */
  async refreshSession(sessionId: string): Promise<DiscoverySession> {
    return this.getDiscoveryStatus(sessionId);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getSupportedFormats();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    activeSessions: number;
    supportedFormats: string[];
  }> {
    const available = await this.isAvailable();
    const activeSessions = this.activeSessions.size;
    const supportedFormats = available 
      ? await this.getSupportedFormats() 
      : [];

    return {
      available,
      activeSessions,
      supportedFormats,
    };
  }
}

// ============================================================================
// Service Instance
// ============================================================================

/** Global discovery service instance */
export const discoveryService = new DiscoveryService({
  debug: import.meta.env.DEV,
});

// ============================================================================
// Exports
// ============================================================================

export default discoveryService;

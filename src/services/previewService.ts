/**
 * Service TypeScript pour la génération de previews
 * Phase 2.3 - Génération de Previews (Pyramide d'Images)
 * Respect strict de TDD : tests développés en parallèle du code
 */

import {
  PreviewType,
  PreviewResult,
  BatchPreviewStats,
  PreviewCacheInfo,
  PreviewError,
  PreviewProgressEvent,
  PreviewPyramidOptions,
  PreviewPyramidResult,
  CacheCleanupConfig,
  PreviewConfig
} from '../types';

// Import Tauri API - utilise le pattern de pont existant comme les autres services
// import { invoke } from '@tauri-apps/api/core';
// import { listen } from '@tauri-apps/api/event';

/**
 * Service de gestion des previews avec wrapper Tauri
 */
export class PreviewService {
  private static instance: PreviewService | null = null;
  private progressListeners: Map<string, (event: PreviewProgressEvent) => void> = new Map();
  private isInitialized = false;
  private isTauriAvailable: boolean | null = null;

  private constructor() {
    this.setupEventListeners();
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
      console.warn(`[PreviewService] Tauri not available, mocking command: ${command}`, { args });
      throw new Error(`Tauri not available: ${command}`);
    };
  }

  /**
   * Vérifie si Tauri est disponible
   */
  private async checkTauriAvailability(): Promise<boolean> {
    try {
      if (this.isTauriAvailable !== null) return this.isTauriAvailable;
      
      // Test simple avec une commande existante
      const invokeFn = PreviewService.getInvoke();
      await invokeFn('get_preview_cache_info', {});
      this.isTauriAvailable = true;
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
    args: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      if (!(await this.checkTauriAvailability())) {
        throw new Error(`Tauri not available for command: ${command}`);
      }

      const invokeFn = PreviewService.getInvoke();
      const result = await invokeFn(command, args) as T;
      return result;
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error(`[PreviewService] Error in command ${command}:`, serviceError);
      throw serviceError;
    }
  }

  /**
   * Récupère l'instance singleton du service
   */
  public static getInstance(): PreviewService {
    if (!PreviewService.instance) {
      PreviewService.instance = new PreviewService();
    }
    return PreviewService.instance;
  }

  /**
   * Initialise le service preview
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.invokeCommand('init_preview_service');
      this.isInitialized = true;
      console.warn('[PreviewService] Service initialisé avec succès');
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur initialisation:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  public async isAvailable(): Promise<boolean> {
    try {
      await this.getCacheInfo();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Génère une preview pour un fichier
   */
  public async generatePreview(
    filePath: string,
    previewType: PreviewType,
    sourceHash: string
  ): Promise<PreviewResult> {
    this.ensureInitialized();
    
    try {
      const result = await this.invokeCommand<PreviewResult>('generate_preview', {
        filePath,
        previewType,
        sourceHash
      });
      
      console.warn(`[PreviewService] Preview générée: ${result.path} (${result.generation_time}ms)`);
      return result;
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur génération preview:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Génère des previews en batch
   */
  public async generateBatchPreviews(
    files: Array<{ path: string; hash: string }>,
    previewType: PreviewType
  ): Promise<BatchPreviewStats> {
    this.ensureInitialized();
    
    try {
      const filesArray = files.map(f => [f.path, f.hash] as [string, string]);
      const stats = await this.invokeCommand<BatchPreviewStats>('generate_batch_previews', {
        files: filesArray,
        previewType
      });
      
      console.warn(`[PreviewService] Batch terminé: ${stats.successful_count}/${stats.total_files} succès`);
      return stats;
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur batch previews:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Génère la pyramide complète des previews pour un fichier
   */
  public async generatePreviewPyramid(
    filePath: string,
    sourceHash: string,
    options: PreviewPyramidOptions = { generate_all: true, force_regenerate: false, emit_progress: true }
  ): Promise<PreviewPyramidResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const previewTypes = options.generate_all 
      ? [PreviewType.Thumbnail, PreviewType.Standard, PreviewType.OneToOne]
      : options.preview_types || [PreviewType.Thumbnail];

    try {
      const results: PreviewResult[] = [];
      
      for (const previewType of previewTypes) {
        const result = await this.generatePreview(filePath, previewType, sourceHash);
        results.push(result);
      }

      const pyramidResult: PreviewPyramidResult = {
        source_hash: sourceHash,
        results,
        total_generation_time: Date.now() - startTime,
        generated_at: new Date().toISOString()
      };

      console.warn(`[PreviewService] Pyramide générée: ${results.length} previews en ${pyramidResult.total_generation_time}ms`);
      return pyramidResult;
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur génération pyramide:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Vérifie si une preview existe en cache
   */
  public async isPreviewCached(
    sourceHash: string,
    previewType: PreviewType
  ): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      return await this.invokeCommand<boolean>('is_preview_cached', {
        sourceHash,
        previewType
      });
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur vérification cache:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Récupère le chemin d'une preview si elle existe
   */
  public async getPreviewPath(
    sourceHash: string,
    previewType: PreviewType
  ): Promise<string | null> {
    this.ensureInitialized();
    
    try {
      return await this.invokeCommand<string | null>('get_preview_path', {
        sourceHash,
        previewType
      });
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur récupération chemin preview:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Récupère les informations sur le cache de previews
   */
  public async getCacheInfo(): Promise<PreviewCacheInfo> {
    this.ensureInitialized();
    
    try {
      return await this.invokeCommand<PreviewCacheInfo>('get_preview_cache_info');
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur récupération cache info:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Nettoie le cache des previews
   */
  public async cleanupCache(config: Partial<CacheCleanupConfig> = {}): Promise<void> {
    this.ensureInitialized();
    
    const defaultConfig: CacheCleanupConfig = {
      max_cache_size: 2 * 1024 * 1024 * 1024, // 2GB
      max_age_days: 30,
      max_previews_per_type: 10000,
      cleanup_interval_hours: 24,
      ...config
    };

    try {
      await this.invokeCommand('cleanup_preview_cache', {
        max_cache_size: defaultConfig.max_cache_size,
        max_age_days: defaultConfig.max_age_days,
        max_previews_per_type: defaultConfig.max_previews_per_type
      });
      
      console.warn('[PreviewService] Cache cleanup terminé');
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur cleanup cache:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Supprime une preview spécifique du cache
   */
  public async removePreview(
    sourceHash: string,
    previewType: PreviewType
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.invokeCommand('remove_preview', {
        sourceHash,
        previewType
      });
      
      console.warn(`[PreviewService] Preview supprimée: ${sourceHash} (${previewType})`);
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur suppression preview:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Génère des previews avec événements de progression
   */
  public async generatePreviewsWithProgress(
    files: Array<{ path: string; hash: string }>,
    previewTypes: PreviewType[]
  ): Promise<BatchPreviewStats> {
    this.ensureInitialized();
    
    try {
      const filesArray = files.map(f => [f.path, f.hash] as [string, string]);
      return await this.invokeCommand<BatchPreviewStats>('generate_previews_with_progress', {
        files: filesArray,
        previewTypes
      });
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur génération avec progression:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Test de performance du service preview
   */
  public async benchmarkPerformance(
    testFile: string,
    iterations = 10
  ): Promise<PreviewResult[]> {
    this.ensureInitialized();
    
    try {
      const results = await this.invokeCommand<PreviewResult[]>('benchmark_preview_generation', {
        testFile,
        iterations
      });
      
      const avgTime = results.reduce((sum: number, r: PreviewResult) => sum + r.generation_time, 0) / results.length;
      console.warn(`[PreviewService] Benchmark: ${iterations} previews, temps moyen: ${avgTime.toFixed(2)}ms`);
      
      return results;
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur benchmark:', serviceError);
      throw serviceError;
    }
  }

  /**
   * Récupère la configuration actuelle du service preview
   */
  public async getConfig(): Promise<PreviewConfig> {
    this.ensureInitialized();
    
    try {
      return await this.invokeCommand<PreviewConfig>('get_preview_config');
    } catch (error) {
      const serviceError = this.createErrorFromUnknown(error);
      console.error('[PreviewService] Erreur récupération config:', serviceError);
      throw serviceError;
    }
  }

  /**
   * S'abonne aux événements de progression
   */
  public onProgress(
    callback: (event: PreviewProgressEvent) => void
  ): () => void {
    const id = `progress_${Date.now()}_${Math.random()}`;
    this.progressListeners.set(id, callback);
    
    return () => {
      this.progressListeners.delete(id);
    };
  }

  /**
   * Configure les écouteurs d'événements Tauri
   * TODO: Implement event listeners using bridge architecture pattern
   */
  private setupEventListeners(): void {
    // Event listeners will be implemented when needed
    // listen('preview_progress', (event: any) => {
    //   const progressEvent = event.payload as PreviewProgressEvent;
    //   this.progressListeners.forEach(callback => {
    //     try {
    //       callback(progressEvent);
    //     } catch (error: any) {
    //       console.error('[PreviewService] Erreur callback progression:', error);
    //     }
    //   });
    // }).catch((error: any) => {
    //   console.error('[PreviewService] Erreur setup écouteur événements:', error);
    // });
  }

  /**
   * Vérifie que le service est initialisé
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PreviewService non initialisé. Appelez initialize() d\'abord.');
    }
  }

  /**
   * Convertit une erreur inconnue en PreviewError
   */
  private createErrorFromUnknown(error: unknown): PreviewError {
    // If it's already a PreviewError, return it as-is
    if (typeof error === 'object' && error !== null && 'type' in error) {
      const previewError = error as PreviewError;
      // Validate it's a proper PreviewError by checking the type
      const validTypes = ['unsupported_format', 'corrupted_file', 'generation_timeout', 'out_of_memory', 'io_error', 'processing_error'];
      if (validTypes.includes(previewError.type)) {
        return previewError;
      }
    }
    
    let message: string;
    let originalMessage: string;
    
    // Extract message from both Error instances and generic objects
    if (error instanceof Error) {
      message = error.message.toLowerCase();
      originalMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      const errorObj = error as { message: string };
      message = errorObj.message.toLowerCase();
      originalMessage = errorObj.message;
    } else {
      message = String(error).toLowerCase();
      originalMessage = String(error);
    }
    
    // Enhanced keyword matching for error type classification
    if (message.includes('unsupported') || message.includes('format')) {
      return { type: 'unsupported_format', format: originalMessage };
    }
    if (message.includes('corrupted') || message.includes('not found')) {
      return { type: 'corrupted_file', path: originalMessage };
    }
    if (message.includes('timeout')) {
      return { type: 'generation_timeout', timeout: 30 };
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return { type: 'out_of_memory' };
    }
    if (message.includes('io') || message.includes('file system') || message.includes('permission')) {
      return { type: 'io_error', message: originalMessage };
    }
    
    return { type: 'processing_error', message: originalMessage };
  }

  /**
   * Utilitaire pour créer des options par défaut
   */
  public static createDefaultPyramidOptions(): PreviewPyramidOptions {
    return {
      generate_all: true,
      force_regenerate: false,
      emit_progress: true
    };
  }

  /**
   * Utilitaire pour créer une configuration de cleanup par défaut
   */
  public static createDefaultCleanupConfig(): CacheCleanupConfig {
    return {
      max_cache_size: 2 * 1024 * 1024 * 1024, // 2GB
      max_age_days: 30,
      max_previews_per_type: 10000,
      cleanup_interval_hours: 24
    };
  }
}

/**
 * Export de l'instance singleton par défaut
 */
export const previewService = PreviewService.getInstance();

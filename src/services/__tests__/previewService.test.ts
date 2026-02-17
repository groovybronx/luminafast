/**
 * Tests unitaires pour PreviewService
 * Phase 2.3 - Génération de Previews (Pyramide d'Images)
 * TDD : Tests développés en parallèle du code
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PreviewService, previewService } from '../previewService';
import { PreviewType, PreviewResult, BatchPreviewStats, PreviewCacheInfo } from '../../types';

// Mock Tauri API pour les tests
const mockInvoke = vi.fn();
const mockListen = vi.fn();

// Mock du module @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
  listen: mockListen
}));

describe('PreviewService', () => {
  let service: PreviewService;

  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();
    
    // Créer une nouvelle instance pour chaque test
    service = PreviewService.getInstance();
    
    // Mock setup des événements
    mockListen.mockResolvedValue({} as any);
  });

  afterEach(() => {
    // Nettoyer l'état du service
    (service as any).isInitialized = false;
  });

  describe('Initialisation', () => {
    it('devrait créer une instance singleton', () => {
      const service1 = PreviewService.getInstance();
      const service2 = PreviewService.getInstance();
      
      expect(service1).toBe(service2);
      expect(service1).toBeInstanceOf(PreviewService);
    });

    it('devrait s\'initialiser avec succès', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      
      await service.initialize();
      
      expect(mockInvoke).toHaveBeenCalledWith('init_preview_service');
      expect((service as any).isInitialized).toBe(true);
    });

    it('devrait lever une erreur si l\'initialisation échoue', async () => {
      const error = new Error('Service indisponible');
      mockInvoke.mockRejectedValueOnce(error);
      
      await expect(service.initialize()).rejects.toThrow('Service indisponible');
      expect((service as any).isInitialized).toBe(false);
    });

    it('devrait vérifier si le service est disponible', async () => {
      mockInvoke.mockResolvedValueOnce({
        total_previews: 0,
        total_size: 0,
        thumbnail_count: 0,
        preview_count: 0,
        last_cleanup: null
      } as PreviewCacheInfo);
      
      const isAvailable = await service.isAvailable();
      
      expect(isAvailable).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('get_preview_cache_info');
    });

    it('devrait retourner false si le service n\'est pas disponible', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Service non disponible'));
      
      const isAvailable = await service.isAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('Génération de previews', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await service.initialize();
    });

    it('devrait générer une preview thumbnail', async () => {
      const mockResult: PreviewResult = {
        path: '/test/thumbnails/b3/test.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 25600,
        generation_time: 150,
        source_hash: 'b3a1c2d3e4f5',
        generated_at: '2026-02-16T10:00:00Z'
      };
      
      mockInvoke.mockResolvedValueOnce(mockResult);
      
      const result = await service.generatePreview(
        '/test/image.cr3',
        PreviewType.Thumbnail,
        'b3a1c2d3e4f5'
      );
      
      expect(result).toEqual(mockResult);
      expect(mockInvoke).toHaveBeenCalledWith('generate_preview', {
        filePath: '/test/image.cr3',
        previewType: PreviewType.Thumbnail,
        sourceHash: 'b3a1c2d3e4f5'
      });
    });

    it('devrait générer une preview standard', async () => {
      const mockResult: PreviewResult = {
        path: '/test/standard/b3/test.jpg',
        preview_type: PreviewType.Standard,
        size: [1440, 1080],
        file_size: 256000,
        generation_time: 450,
        source_hash: 'b3a1c2d3e4f5',
        generated_at: '2026-02-16T10:00:00Z'
      };
      
      mockInvoke.mockResolvedValueOnce(mockResult);
      
      const result = await service.generatePreview(
        '/test/image.cr3',
        PreviewType.Standard,
        'b3a1c2d3e4f5'
      );
      
      expect(result.preview_type).toBe(PreviewType.Standard);
      expect(result.size).toEqual([1440, 1080]);
    });

    it('devrait lever une erreur si la génération échoue', async () => {
      const error = new Error('Fichier corrompu');
      mockInvoke.mockRejectedValueOnce(error);
      
      await expect(
        service.generatePreview('/test/corrupt.cr3', PreviewType.Thumbnail, 'hash123')
      ).rejects.toThrow('Fichier corrompu');
    });

    it('devrait vérifier si le service est initialisé avant génération', async () => {
      (service as any).isInitialized = false;
      
      await expect(
        service.generatePreview('/test/image.cr3', PreviewType.Thumbnail, 'hash123')
      ).rejects.toThrow('PreviewService non initialisé');
    });
  });

  describe('Génération batch', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await service.initialize();
    });

    it('devrait générer des previews en batch', async () => {
      const files = [
        { path: '/test/image1.cr3', hash: 'hash1' },
        { path: '/test/image2.cr3', hash: 'hash2' }
      ];
      
      const mockStats: BatchPreviewStats = {
        batch_id: 'batch-123',
        total_files: 2,
        successful_count: 2,
        failed_count: 0,
        skipped_count: 0,
        total_duration: 800,
        avg_time_per_file: 400,
        started_at: '2026-02-16T10:00:00Z',
        completed_at: '2026-02-16T10:00:01Z'
      };
      
      mockInvoke.mockResolvedValueOnce(mockStats);
      
      const stats = await service.generateBatchPreviews(files, PreviewType.Thumbnail);
      
      expect(stats.successful_count).toBe(2);
      expect(stats.total_files).toBe(2);
      expect(mockInvoke).toHaveBeenCalledWith('generate_batch_previews', {
        files: [['/test/image1.cr3', 'hash1'], ['/test/image2.cr3', 'hash2']],
        previewType: PreviewType.Thumbnail
      });
    });

    it('devrait gérer les erreurs partielles en batch', async () => {
      const files = [
        { path: '/test/good.cr3', hash: 'hash1' },
        { path: '/test/bad.cr3', hash: 'hash2' }
      ];
      
      const mockStats: BatchPreviewStats = {
        batch_id: 'batch-456',
        total_files: 2,
        successful_count: 1,
        failed_count: 1,
        skipped_count: 0,
        total_duration: 600,
        avg_time_per_file: 300,
        started_at: '2026-02-16T10:00:00Z',
        completed_at: '2026-02-16T10:00:01Z'
      };
      
      mockInvoke.mockResolvedValueOnce(mockStats);
      
      const stats = await service.generateBatchPreviews(files, PreviewType.Thumbnail);
      
      expect(stats.successful_count).toBe(1);
      expect(stats.failed_count).toBe(1);
    });
  });

  describe('Pyramide de previews', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await service.initialize();
    });

    it('devrait générer la pyramide complète', async () => {
      const mockResults: PreviewResult[] = [
        {
          path: '/test/thumbnails/b3/test.jpg',
          preview_type: PreviewType.Thumbnail,
          size: [240, 180],
          file_size: 25600,
          generation_time: 150,
          source_hash: 'b3a1c2d3e4f5',
          generated_at: '2026-02-16T10:00:00Z'
        },
        {
          path: '/test/standard/b3/test.jpg',
          preview_type: PreviewType.Standard,
          size: [1440, 1080],
          file_size: 256000,
          generation_time: 450,
          source_hash: 'b3a1c2d3e4f5',
          generated_at: '2026-02-16T10:00:01Z'
        },
        {
          path: '/test/native/b3/test.jpg',
          preview_type: PreviewType.OneToOne,
          size: [6000, 4000],
          file_size: 2048000,
          generation_time: 1200,
          source_hash: 'b3a1c2d3e4f5',
          generated_at: '2026-02-16T10:00:02Z'
        }
      ];
      
      // Mock des appels individuels
      mockInvoke.mockResolvedValue(mockResults[0]);
      mockInvoke.mockResolvedValue(mockResults[1]);
      mockInvoke.mockResolvedValue(mockResults[2]);
      
      const pyramid = await service.generatePreviewPyramid(
        '/test/image.cr3',
        'b3a1c2d3e4f5'
      );
      
      expect(pyramid.results).toHaveLength(3);
      expect(pyramid.results[0]?.preview_type).toBe(PreviewType.Thumbnail);
      expect(pyramid.results[1]?.preview_type).toBe(PreviewType.Standard);
      expect(pyramid.results[2]?.preview_type).toBe(PreviewType.OneToOne);
      expect(pyramid.source_hash).toBe('b3a1c2d3e4f5');
      expect(pyramid.total_generation_time).toBeGreaterThan(0);
    });

    it('devrait générer uniquement les types spécifiés', async () => {
      const mockResult: PreviewResult = {
        path: '/test/thumbnails/b3/test.jpg',
        preview_type: PreviewType.Thumbnail,
        size: [240, 180],
        file_size: 25600,
        generation_time: 150,
        source_hash: 'b3a1c2d3e4f5',
        generated_at: '2026-02-16T10:00:00Z'
      };
      
      mockInvoke.mockResolvedValue(mockResult);
      
      const options = {
        generate_all: false,
        preview_types: [PreviewType.Thumbnail],
        force_regenerate: false,
        emit_progress: true
      };
      
      const pyramid = await service.generatePreviewPyramid(
        '/test/image.cr3',
        'b3a1c2d3e4f5',
        options
      );
      
      expect(pyramid.results).toHaveLength(1);
      expect(pyramid.results[0]?.preview_type).toBe(PreviewType.Thumbnail);
    });
  });

  describe('Cache management', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await service.initialize();
    });

    it('devrait vérifier si une preview est en cache', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      
      const isCached = await service.isPreviewCached('hash123', PreviewType.Thumbnail);
      
      expect(isCached).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('is_preview_cached', {
        sourceHash: 'hash123',
        previewType: PreviewType.Thumbnail
      });
    });

    it('devrait récupérer le chemin d\'une preview en cache', async () => {
      const expectedPath = '/test/previews/thumbnails/b3/hash123.jpg';
      mockInvoke.mockResolvedValueOnce(expectedPath);
      
      const path = await service.getPreviewPath('hash123', PreviewType.Thumbnail);
      
      expect(path).toBe(expectedPath);
    });

    it('devrait retourner null si la preview n\'est pas en cache', async () => {
      mockInvoke.mockResolvedValueOnce(null);
      
      const path = await service.getPreviewPath('hash456', PreviewType.Standard);
      
      expect(path).toBeNull();
    });

    it('devrait récupérer les informations du cache', async () => {
      const mockCacheInfo: PreviewCacheInfo = {
        total_previews: 150,
        total_size: 1024 * 1024 * 50, // 50MB
        thumbnail_count: 100,
        preview_count: 50,
        last_cleanup: '2026-02-15T12:00:00Z'
      };
      
      mockInvoke.mockResolvedValueOnce(mockCacheInfo);
      
      const cacheInfo = await service.getCacheInfo();
      
      expect(cacheInfo.total_previews).toBe(150);
      expect(cacheInfo.thumbnail_count).toBe(100);
      expect(cacheInfo.preview_count).toBe(50);
    });

    it('devrait nettoyer le cache', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      
      await service.cleanupCache({
        max_cache_size: 1024 * 1024 * 100, // 100MB
        max_age_days: 7
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('cleanup_preview_cache', {
        max_cache_size: 1024 * 1024 * 100,
        max_age_days: 7,
        max_previews_per_type: 10000
      });
    });

    it('devrait supprimer une preview spécifique', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      
      await service.removePreview('hash123', PreviewType.Thumbnail);
      
      expect(mockInvoke).toHaveBeenCalledWith('remove_preview', {
        sourceHash: 'hash123',
        previewType: PreviewType.Thumbnail
      });
    });
  });

  describe('Gestion d\'erreurs', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await service.initialize();
    });

    it('devrait convertir les erreurs Tauri en PreviewError', async () => {
      const error = new Error('Unsupported format: cr3');
      mockInvoke.mockRejectedValueOnce(error);
      
      try {
        await service.generatePreview('/test/image.cr3', PreviewType.Thumbnail, 'hash123');
        expect.fail('Devrait lever une erreur');
      } catch (error) {
        expect(error).toEqual({
          type: 'unsupported_format',
          format: 'unsupported format: cr3'
        });
      }
    });

    it('devrait gérer les erreurs timeout', async () => {
      const error = new Error('Generation timeout after 30s');
      mockInvoke.mockRejectedValueOnce(error);
      
      try {
        await service.generatePreview('/test/image.cr3', PreviewType.Thumbnail, 'hash123');
        expect.fail('Devrait lever une erreur');
      } catch (error) {
        expect(error).toEqual({
          type: 'generation_timeout',
          timeout: 30
        });
      }
    });

    it('devrait gérer les erreurs de fichiers corrompus', async () => {
      const error = new Error('Corrupted file: /test/bad.cr3');
      mockInvoke.mockRejectedValueOnce(error);
      
      try {
        await service.generatePreview('/test/bad.cr3', PreviewType.Thumbnail, 'hash123');
        expect.fail('Devrait lever une erreur');
      } catch (error) {
        expect(error).toEqual({
          type: 'corrupted_file',
          path: 'corrupted file: /test/bad.cr3'
        });
      }
    });
  });

  describe('Utilitaires', () => {
    it('devrait créer des options par défaut pour la pyramide', () => {
      const options = PreviewService.createDefaultPyramidOptions();
      
      expect(options.generate_all).toBe(true);
      expect(options.emit_progress).toBe(true);
    });

    it('devrait créer une configuration de cleanup par défaut', () => {
      const config = PreviewService.createDefaultCleanupConfig();
      
      expect(config.max_cache_size).toBe(2 * 1024 * 1024 * 1024); // 2GB
      expect(config.max_age_days).toBe(30);
      expect(config.max_previews_per_type).toBe(10000);
      expect(config.cleanup_interval_hours).toBe(24);
    });
  });

  describe('Événements de progression', () => {
    beforeEach(async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      await service.initialize();
    });

    it('devrait s\'abonner aux événements de progression', () => {
      const callback = vi.fn();
      const unsubscribe = service.onProgress(callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(mockListen).toHaveBeenCalledWith('preview_progress', expect.any(Function));
    });

    it('devrait se désabonner correctement', () => {
      const callback = vi.fn();
      const unsubscribe = service.onProgress(callback);
      
      // Simuler plusieurs listeners
      const unsubscribe2 = service.onProgress(vi.fn());
      
      unsubscribe();
      
      // Vérifier que le listener a été retiré
      expect((service as any).progressListeners.size).toBe(1);
      
      // Utiliser unsubscribe2 pour éviter l'avertissement
      unsubscribe2();
    });
  });
});

describe('previewService (export par défaut)', () => {
  it('devrait exporter l\'instance singleton par défaut', () => {
    expect(previewService).toBeInstanceOf(PreviewService);
    expect(previewService).toBe(PreviewService.getInstance());
  });
});

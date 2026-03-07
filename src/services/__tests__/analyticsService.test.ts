/**
 * Analytics Service Tests — Phase 6.2
 *
 * Unit tests for AnalyticsService TypeScript wrapper.
 * Tests async API, error handling, and type safety.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AnalyticsService,
  GroupByResult,
  CatalogStats,
  AggregationType,
} from '../analyticsService';

// ============================================================================
// Mock Tauri invoke
// ============================================================================

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getAggregations Tests
  // =========================================================================

  describe('getAggregations', () => {
    it('calls invoke with correct command and parameters', async () => {
      const mockResults: GroupByResult[] = [{ key: '2024-01', count: 345, percentage: 12.5 }];

      (invoke as any).mockResolvedValueOnce(mockResults);

      const result = await AnalyticsService.getAggregations('month');

      expect(invoke).toHaveBeenCalledWith('get_aggregations', {
        groupBy: 'month',
      });
      expect(result).toEqual(mockResults);
    });

    it('returns array of GroupByResult objects', async () => {
      const mockResults: GroupByResult[] = [
        { key: '2024-01', count: 345, percentage: 12.5 },
        { key: '2024-02', count: 298, percentage: 10.8 },
      ];

      (invoke as any).mockResolvedValueOnce(mockResults);

      const result = await AnalyticsService.getAggregations('camera');

      expect(result).toHaveLength(2);
      expect(result[0]!.key).toBe('2024-01');
      expect(result[1]!.percentage).toBe(10.8);
    });

    it('handles all supported aggregation types', async () => {
      const types: AggregationType[] = ['month', 'camera', 'iso', 'rating'];

      for (const type of types) {
        (invoke as any).mockResolvedValueOnce([]);
        await AnalyticsService.getAggregations(type);
        expect(invoke).toHaveBeenCalledWith('get_aggregations', { groupBy: type });
      }
    });

    it('throws error on invoke failure', async () => {
      const error = new Error('Backend error');
      (invoke as any).mockRejectedValueOnce(error);

      await expect(AnalyticsService.getAggregations('month')).rejects.toThrow(
        'Failed to fetch aggregations',
      );
    });

    it('returns empty array for empty catalog', async () => {
      (invoke as any).mockResolvedValueOnce([]);

      const result = await AnalyticsService.getAggregations('rating');

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getCatalogStatistics Tests
  // =========================================================================

  describe('getCatalogStatistics', () => {
    it('calls invoke with correct command', async () => {
      const mockStats: CatalogStats = {
        totalImages: 0,
        totalSizeGb: 0,
        averageImageSize: 0,
        ratedImagesCount: 0,
        flaggedImagesCount: 0,
        distributionByRating: [],
        distributionByCamera: [],
        distributionByISO: [],
      };

      (invoke as any).mockResolvedValueOnce(mockStats);

      await AnalyticsService.getCatalogStatistics();

      expect(invoke).toHaveBeenCalledWith('get_catalog_statistics');
    });

    it('returns complete CatalogStats object', async () => {
      const mockStats: CatalogStats = {
        totalImages: 12547,
        totalSizeGb: 342.5,
        oldestImageDate: '2020-01-15',
        newestImageDate: '2024-03-07',
        averageImageSize: 27648,
        ratedImagesCount: 3421,
        flaggedImagesCount: 567,
        distributionByRating: [
          { rating: 0, count: 9126 },
          { rating: 5, count: 2341 },
        ],
        distributionByCamera: [{ camera: 'Canon EOS R5', count: 5000 }],
        distributionByISO: [{ iso: 400, count: 3000 }],
      };

      (invoke as any).mockResolvedValueOnce(mockStats);

      const result = await AnalyticsService.getCatalogStatistics();

      expect(result.totalImages).toBe(12547);
      expect(result.totalSizeGb).toBe(342.5);
      expect(result.oldestImageDate).toBe('2020-01-15');
      expect(result.ratedImagesCount).toBe(3421);
      expect(result.distributionByRating).toHaveLength(2);
    });

    it('handles empty catalog', async () => {
      const mockStats: CatalogStats = {
        totalImages: 0,
        totalSizeGb: 0,
        oldestImageDate: undefined,
        newestImageDate: undefined,
        averageImageSize: 0,
        ratedImagesCount: 0,
        flaggedImagesCount: 0,
        distributionByRating: [],
        distributionByCamera: [],
        distributionByISO: [],
      };

      (invoke as any).mockResolvedValueOnce(mockStats);

      const result = await AnalyticsService.getCatalogStatistics();

      expect(result.totalImages).toBe(0);
      expect(result.oldestImageDate).toBeUndefined();
    });

    it('throws error on invoke failure', async () => {
      (invoke as any).mockRejectedValueOnce(new Error('DB error'));

      await expect(AnalyticsService.getCatalogStatistics()).rejects.toThrow(
        'Failed to fetch catalog statistics',
      );
    });
  });

  // =========================================================================
  // executeSmartQuery Tests
  // =========================================================================

  describe('executeSmartQuery', () => {
    it('calls invoke with query JSON', async () => {
      const query = JSON.stringify({ rules: [{ field: 'rating', operator: '>=', value: 4 }] });
      (invoke as any).mockResolvedValueOnce([1, 2, 3]);

      await AnalyticsService.executeSmartQuery(query);

      expect(invoke).toHaveBeenCalledWith('execute_smart_query', {
        queryJson: query,
      });
    });

    it('returns array of image IDs', async () => {
      const query = JSON.stringify({});
      const mockIds = [10, 42, 156, 1003];

      (invoke as any).mockResolvedValueOnce(mockIds);

      const result = await AnalyticsService.executeSmartQuery(query);

      expect(result).toEqual(mockIds);
      expect(result).toHaveLength(4);
    });

    it('returns empty array when no matches', async () => {
      (invoke as any).mockResolvedValueOnce([]);

      const result = await AnalyticsService.executeSmartQuery('{}');

      expect(result).toEqual([]);
    });

    it('throws error on invoke failure', async () => {
      (invoke as any).mockRejectedValueOnce(new Error('Parse error'));

      await expect(AnalyticsService.executeSmartQuery('{}')).rejects.toThrow(
        'Failed to execute smart query',
      );
    });
  });

  // =========================================================================
  // syncDuckdbFromSqlite Tests
  // =========================================================================

  describe('syncDuckdbFromSqlite', () => {
    it('calls invoke with correct command', async () => {
      (invoke as any).mockResolvedValueOnce({
        lastSyncTs: 1234567890,
        totalRecords: 5000,
        syncDurationMs: 500,
      });

      await AnalyticsService.syncDuckdbFromSqlite();

      expect(invoke).toHaveBeenCalledWith('sync_duckdb_from_sqlite');
    });

    it('returns sync metadata', async () => {
      const mockMetadata = {
        lastSyncTs: 1234567890,
        totalRecords: 12547,
        syncDurationMs: 1234,
      };

      (invoke as any).mockResolvedValueOnce(mockMetadata);

      const result = await AnalyticsService.syncDuckdbFromSqlite();

      expect(result.lastSyncTs).toBe(1234567890);
      expect(result.totalRecords).toBe(12547);
      expect(result.syncDurationMs).toBe(1234);
    });

    it('handles sync errors gracefully', async () => {
      (invoke as any).mockRejectedValueOnce(new Error('Connection lost'));

      await expect(AnalyticsService.syncDuckdbFromSqlite()).rejects.toThrow('DuckDB sync failed');
    });

    it('returns zero records for empty database', async () => {
      (invoke as any).mockResolvedValueOnce({
        lastSyncTs: 1234567890,
        totalRecords: 0,
        syncDurationMs: 50,
      });

      const result = await AnalyticsService.syncDuckdbFromSqlite();

      expect(result.totalRecords).toBe(0);
    });
  });

  // =========================================================================
  // Type Safety Tests
  // =========================================================================

  describe('Type Safety', () => {
    it('AggregationType enforces valid values', () => {
      const validTypes: AggregationType[] = ['month', 'camera', 'iso', 'rating'];

      // TypeScript compiler ensures only these values are valid at compile time
      expect(validTypes).toHaveLength(4);
    });

    it('GroupByResult has required properties', () => {
      const result: GroupByResult = {
        key: '2024-01',
        count: 345,
        percentage: 12.5,
      };

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('percentage');
    });

    it('CatalogStats supports optional date fields', () => {
      const stats1: CatalogStats = {
        totalImages: 0,
        totalSizeGb: 0,
        averageImageSize: 0,
        ratedImagesCount: 0,
        flaggedImagesCount: 0,
        distributionByRating: [],
        distributionByCamera: [],
        distributionByISO: [],
      };

      const stats2: CatalogStats = {
        ...stats1,
        oldestImageDate: '2020-01-15',
        newestImageDate: '2024-03-07',
      };

      expect(stats1.oldestImageDate).toBeUndefined();
      expect(stats2.oldestImageDate).toBe('2020-01-15');
    });
  });
});

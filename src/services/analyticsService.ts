/**
 * Analytics Service — Phase 6.2
 *
 * Frontend wrapper for DuckDB OLAP analytics commands.
 * Provides Promise-based async API for aggregations and statistics.
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GroupByResult {
  key: string;
  count: number;
  percentage: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface CameraDistribution {
  camera: string;
  count: number;
}

export interface IsoDistribution {
  iso: number;
  count: number;
}

export interface CatalogStats {
  totalImages: number;
  totalSizeGb: number;
  oldestImageDate?: string;
  newestImageDate?: string;
  averageImageSize: number;
  ratedImagesCount: number;
  flaggedImagesCount: number;
  distributionByRating: RatingDistribution[];
  distributionByCamera: CameraDistribution[];
  distributionByISO: IsoDistribution[];
}

export interface SyncMetadata {
  lastSyncTs: number;
  totalRecords: number;
  syncDurationMs: number;
}

export type AggregationType = 'month' | 'camera' | 'iso' | 'rating';

// ============================================================================
// Analytics Service
// ============================================================================

export class AnalyticsService {
  /**
   * Get aggregated statistics grouped by a specific attribute.
   *
   * Supported group types:
   * - "month": Group by YYYY-MM
   * - "camera": Group by camera model
   * - "iso": Group by ISO sensitivity
   * - "rating": Group by user rating (0-5)
   *
   * @param groupBy The attribute to group by
   * @returns Array of grouped results with counts and percentages
   * @throws Error if the Tauri command fails
   *
   * @example
   * const monthlyStats = await AnalyticsService.getAggregations("month");
   * // [
   * //   { key: "2024-01", count: 345, percentage: 12.5 },
   * //   { key: "2024-02", count: 298, percentage: 10.8 }
   * // ]
   */
  static async getAggregations(groupBy: AggregationType): Promise<GroupByResult[]> {
    try {
      if (import.meta.env.DEV) {
        console.warn(`[Analytics] getAggregations(${groupBy})`);
      }

      const results = await invoke<GroupByResult[]>('get_aggregations', {
        groupBy,
      });

      return results;
    } catch (error) {
      const message = `Failed to fetch aggregations: ${error}`;
      if (import.meta.env.DEV) {
        console.error(message);
      }
      throw new Error(message);
    }
  }

  /**
   * Get comprehensive catalog statistics.
   *
   * Returns metadata about the entire image library including:
   * - Total image count and size
   * - Date range of imported images
   * - Average image size
   * - Rating and flag statistics
   * - Distribution breakdowns (by camera, ISO, rating)
   *
   * @returns Catalog statistics object
   * @throws Error if the Tauri command fails or database is inaccessible
   *
   * @example
   * const stats = await AnalyticsService.getCatalogStatistics();
   * console.log(`Total images: ${stats.totalImages}`);
   * console.log(`Total size: ${stats.totalSizeGb.toFixed(1)} GB`);
   */
  static async getCatalogStatistics(): Promise<CatalogStats> {
    try {
      if (import.meta.env.DEV) {
        console.warn('[Analytics] getCatalogStatistics');
      }

      const stats = await invoke<CatalogStats>('get_catalog_statistics');

      return stats;
    } catch (error) {
      const message = `Failed to fetch catalog statistics: ${error}`;
      if (import.meta.env.DEV) {
        console.error(message);
      }
      throw new Error(message);
    }
  }

  /**
   * Execute a smart collection query on DuckDB.
   *
   * Parses complex query JSON and returns matching image IDs.
   * Supports filtering by rating, flags, camera, ISO, date range, etc.
   *
   * @param queryJson Smart collection query in JSON format
   * @returns Array of matching image IDs
   * @throws Error if query parsing or execution fails
   *
   * @example
   * const ids = await AnalyticsService.executeSmartQuery(
   *   JSON.stringify({
   *     rules: [
   *       { field: "rating", operator: ">=", value: 4 },
   *       { field: "camera_model", operator: "contains", value: "Canon" }
   *     ],
   *     combineWith: "AND"
   *   })
   * );
   */
  static async executeSmartQuery(queryJson: string): Promise<number[]> {
    try {
      if (import.meta.env.DEV) {
        console.warn(`[Analytics] executeSmartQuery: ${queryJson.substring(0, 50)}...`);
      }

      const imageIds = await invoke<number[]>('execute_smart_query', {
        queryJson,
      });

      return imageIds;
    } catch (error) {
      const message = `Failed to execute smart query: ${error}`;
      if (import.meta.env.DEV) {
        console.error(message);
      }
      throw new Error(message);
    }
  }

  /**
   * Synchronize SQLite database to DuckDB.
   *
   * Triggers a full or incremental sync from SQLite to DuckDB.
   * Non-blocking operation that runs asynchronously.
   *
   * @returns Sync metadata (timestamp, records synced, duration)
   * @throws Error if sync fails
   *
   * @internal
   * Called periodically (every 5 minutes) or after bulk data changes.
   */
  static async syncDuckdbFromSqlite(): Promise<SyncMetadata> {
    try {
      if (import.meta.env.DEV) {
        console.warn('[Analytics] syncDuckdbFromSqlite');
      }

      const metadata = await invoke<SyncMetadata>('sync_duckdb_from_sqlite');

      if (import.meta.env.DEV) {
        console.warn(
          `[Analytics] Sync complete: ${metadata.totalRecords} records in ${metadata.syncDurationMs}ms`,
        );
      }

      return metadata;
    } catch (error) {
      const message = `DuckDB sync failed: ${error}`;
      if (import.meta.env.DEV) {
        console.error(message);
      }
      throw new Error(message);
    }
  }
}

export default AnalyticsService;

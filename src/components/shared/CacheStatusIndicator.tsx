/**
 * Cache Status Indicator — Phase 6.1.4
 *
 * Displays cache effectiveness metrics in the top bar.
 * Shows hit rate, L1 size, and L2 disk usage.
 */

import { useEffect, useState } from 'react';
import { BackendCacheService } from '../../services/backendCacheService';
import type { CacheStatsResponse } from '../../services/backendCacheService';
import { CacheWarmingService } from '../../services/cacheWarmingService';

export function CacheStatusIndicator() {
  const [stats, setStats] = useState<CacheStatsResponse | null>(null);
  const [isWarming, setIsWarming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Refresh cache stats every 5 seconds
    const interval = setInterval(async () => {
      try {
        const newStats = await BackendCacheService.getCacheStats();
        setStats(newStats);
        setError(null);

        // Check warming status
        setIsWarming(CacheWarmingService.isCurrentlyWarming());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }, 5000);

    // Initial fetch
    (async () => {
      try {
        const initialStats = await BackendCacheService.getCacheStats();
        setStats(initialStats);
        setIsWarming(CacheWarmingService.isCurrentlyWarming());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    })();

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="cache-status cache-status--error" title={`Cache error: ${error}`}>
        ⚠️ Cache Error
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="cache-status cache-status--loading" title="Loading cache stats...">
        ⏳ Cache Loading
      </div>
    );
  }

  const l1Util = stats.l1.utilization;
  const l1HitRate = stats.l1.hitRate;
  const l2Util = stats.l2.diskUsage;
  const detailsUtil = stats.details.utilization;
  const detailsHitRate = stats.details.hitRate;
  const warmingIndicator = isWarming ? ' 🔄' : '';

  // Color indicator based on details cache hit rate (primary hot path for catalog reads)
  const detailsRate = parseFloat(detailsHitRate);
  let statusClass = 'cache-status--cold'; // < 50% or N/A
  if (!isNaN(detailsRate) && detailsRate >= 80) {
    statusClass = 'cache-status--hot';
  } else if (!isNaN(detailsRate) && detailsRate >= 50) {
    statusClass = 'cache-status--warm';
  }

  return (
    <div
      className={`cache-status ${statusClass}`}
      title={`Catalogue: ${detailsUtil} (${detailsHitRate}) | Miniatures L1: ${l1Util} (${l1HitRate}) | L2: ${l2Util}`}
    >
      📦 {detailsUtil} ({detailsHitRate}){warmingIndicator}
    </div>
  );
}

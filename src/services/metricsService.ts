/**
 * Metrics Service for M.1.1a Threadpool Monitoring
 *
 * TODO [M.1.1a]: Complete metrics service implementation
 * Current status: Service structure created, needs:
 * 1. Implement getThreadpoolMetrics() - call Tauri command
 * 2. Implement onSaturationAlert() - listen to threadpool-saturation-alert events
 * 3. Add polling mechanism (optional) - call getThreadpoolMetrics() every 500ms during import
 * 4. Handle disconnection/reconnection gracefully
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface ThreadpoolMetrics {
  active_tasks: number;
  queue_depth: number;
  max_threads: number;
  saturation_percentage: number;
}

class MetricsService {
  private listeners: Map<string, UnlistenFn[]> = new Map();

  async getThreadpoolMetrics(): Promise<ThreadpoolMetrics | null> {
    try {
      // TODO: Call Tauri command once get_threadpool_metrics is connected to real metrics
      const metrics = await invoke<ThreadpoolMetrics>('get_threadpool_metrics');
      return metrics;
    } catch (error) {
      console.error('[MetricsService] Failed to get threadpool metrics:', error);
      return null;
    }
  }

  /**
   * Subscribe to saturation alerts (>80% threadpool utilization)
   * TODO: Once simulate_threadpool_load is removed, events will only fire during real batch_ingest
   */
  async onSaturationAlert(callback: (metrics: ThreadpoolMetrics) => void): Promise<UnlistenFn> {
    const unlisten = await listen<ThreadpoolMetrics>('threadpool-saturation-alert', (event) => {
      callback(event.payload);
    });
    const existingListeners = this.listeners.get('saturation');
    if (existingListeners) {
      existingListeners.push(unlisten);
    } else {
      this.listeners.set('saturation', [unlisten]);
    }
    return unlisten;
  }

  /**
   * Unsubscribe from a specific event
   */
  unsubscribe(type: string, unlisten: UnlistenFn): void {
    const listeners = this.listeners.get(type) || [];
    const index = listeners.indexOf(unlisten);
    if (index > -1) {
      listeners.splice(index, 1);
      unlisten();
    }
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    for (const listeners of this.listeners.values()) {
      listeners.forEach((unlisten) => unlisten());
    }
    this.listeners.clear();
  }
}

export const metricsService = new MetricsService();

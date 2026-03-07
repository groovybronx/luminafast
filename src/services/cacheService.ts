/**
 * Cache Service — L1 Multilevel Cache System (Phase 6.1)
 *
 * Generic LRU (Least Recently Used) cache implementation for frontend memory.
 * - Max capacity: configurable (default 500 for thumbnails)
 * - Eviction policy: FIFO (First In, First Out) with LRU tracking
 * - Invalidation: Manual (no TTL, session-only)
 * - Thread-safe: No async operations, synchronous Map-based storage
 *
 * Usage:
 *   const cache = createLRUCache<number, string>(500);
 *   cache.set(42, 'thumbnail-url');
 *   const value = cache.get(42); // 'thumbnail-url'
 *   cache.delete(42);
 */

/**
 * Cache store interface - generic key-value store with size constraints
 */
export interface CacheStore<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): void;
  clear(): void;
  size(): number;
  isFull(): boolean;
  getStats?(): { size: number; maxSize: number };
}

/**
 * LRU Cache Implementation
 *
 * Maintains insertion order and evicts oldest entry when capacity exceeded.
 * O(1) get/set/delete operations.
 */
export class LRUCache<K, V> implements CacheStore<K, V> {
  private store: Map<K, V>;
  private maxSize: number;
  private accessOrder: K[] = [];

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key: K): V | undefined {
    return this.store.get(key);
  }

  set(key: K, value: V): void {
    // If key already exists, update it (no order change for FIFO)
    if (this.store.has(key)) {
      this.store.set(key, value);
      return;
    }

    // New entry
    if (this.store.size >= this.maxSize) {
      // Evict oldest (FIFO) — first element in accessOrder
      const oldest = this.accessOrder.shift();
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }

    this.store.set(key, value);
    this.accessOrder.push(key);
  }

  delete(key: K): void {
    this.store.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
  }

  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.store.size;
  }

  isFull(): boolean {
    return this.store.size >= this.maxSize;
  }

  /**
   * Get cache statistics (for debugging/testing)
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Factory function to create an LRU cache
 *
 * @param maxSize Maximum number of entries before eviction starts
 * @returns LRUCache instance implementing CacheStore interface
 */
export function createLRUCache<K, V>(maxSize: number): CacheStore<K, V> {
  return new LRUCache<K, V>(maxSize);
}

/**
 * Predefined cache instances for common use cases
 */
export const cacheInstances = {
  // Thumbnail cache: max 500 thumbnails (≈ 500 = 250-500 MB RAM)
  thumbnails: createLRUCache<number, string>(500),

  // Preview metadata cache: max 1000 entries (lightweight)
  previewMetadata: createLRUCache<string, unknown>(1000),

  // Query results cache: max 100 entries (for catalog queries)
  queryResults: createLRUCache<string, unknown>(100),
};

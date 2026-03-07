/**
 * Cache Service Tests — Phase 6.1
 *
 * Tests for LRU cache implementation:
 * - Basic operations (get, set, delete)
 * - FIFO eviction policy
 * - Size limits
 * - Cache statistics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createLRUCache, LRUCache } from '@/services/cacheService';

describe('LRUCache', () => {
  let cache: LRUCache<number, string>;

  beforeEach(() => {
    cache = new LRUCache<number, string>(3); // max 3 entries
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set(1, 'one');
      expect(cache.get(1)).toBe('one');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get(999)).toBeUndefined();
    });

    it('should delete entries', () => {
      cache.set(1, 'one');
      cache.delete(1);
      expect(cache.get(1)).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get(1)).toBeUndefined();
      expect(cache.get(2)).toBeUndefined();
    });
  });

  describe('Size Management', () => {
    it('should track correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set(1, 'one');
      expect(cache.size()).toBe(1);
      cache.set(2, 'two');
      expect(cache.size()).toBe(2);
    });

    it('should report isFull correctly', () => {
      expect(cache.isFull()).toBe(false);
      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three');
      expect(cache.isFull()).toBe(true);
    });
  });

  describe('FIFO Eviction Policy', () => {
    it('should evict oldest entry when capacity exceeded', () => {
      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three');
      expect(cache.size()).toBe(3);

      // Add fourth entry → should evict first (FIFO)
      cache.set(4, 'four');
      expect(cache.size()).toBe(3);
      expect(cache.get(1)).toBeUndefined(); // First should be gone
      expect(cache.get(2)).toBe('two');
      expect(cache.get(3)).toBe('three');
      expect(cache.get(4)).toBe('four');
    });

    it('should evict in order (FIFO sequence)', () => {
      // Insert 1, 2, 3, 4, 5 (capacity 3)
      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three');
      cache.set(4, 'four'); // Evicts 1
      cache.set(5, 'five'); // Evicts 2

      expect(cache.get(1)).toBeUndefined();
      expect(cache.get(2)).toBeUndefined();
      expect(cache.get(3)).toBe('three');
      expect(cache.get(4)).toBe('four');
      expect(cache.get(5)).toBe('five');
    });

    it('should not change order when updating existing key', () => {
      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three');

      // Update key 1 (should not change FIFO order)
      cache.set(1, 'ONE');

      // Add new entry (should evict oldest entry = 1, not 2)
      cache.set(4, 'four');

      expect(cache.get(1)).toBeUndefined(); // Evicted (was oldest in insertion order)
      expect(cache.get(2)).toBe('two');
      expect(cache.get(3)).toBe('three');
      expect(cache.get(4)).toBe('four');
    });
  });

  describe('Generic Type Support', () => {
    it('should support number keys and string values', () => {
      cache.set(42, 'answer');
      expect(cache.get(42)).toBe('answer');
    });

    it('should support string keys and complex values', () => {
      const complexCache = createLRUCache<string, { id: number; name: string }>(2);
      const obj1 = { id: 1, name: 'Alice' };
      complexCache.set('alice', obj1);
      expect(complexCache.get('alice')).toEqual(obj1);
    });
  });

  describe('Statistics', () => {
    it('should return correct stats', () => {
      cache.set(1, 'one');
      cache.set(2, 'two');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });
  });

  describe('Factory Function', () => {
    it('should create cache via factory function', () => {
      const factoryCache = createLRUCache<number, string>(5);
      factoryCache.set(1, 'test');
      expect(factoryCache.get(1)).toBe('test');
    });
  });
});

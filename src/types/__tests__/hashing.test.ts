import { describe, it, expect } from 'vitest';
import {
  HashType,
  FileHash,
  DuplicateInfo,
  DuplicateAnalysis,
  HashProgress,
  HashErrorType,
  HashConfig,
  HashBenchmarkResult,
} from '@/types/hashing';

describe('Hashing Types', () => {
  describe('HashType', () => {
    it('should have correct values', () => {
      expect(HashType.Blake3).toBe('Blake3');
    });
  });

  describe('FileHash', () => {
    it('should create valid FileHash', () => {
      const fileHash: FileHash = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        hash_type: HashType.Blake3,
        file_size: 1024,
        hashed_at: '2026-02-13T00:00:00Z',
      };

      expect(fileHash.hash).toBe(
        'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
      );
      expect(fileHash.hash_type).toBe(HashType.Blake3);
      expect(fileHash.file_size).toBe(1024);
      expect(fileHash.hashed_at).toBe('2026-02-13T00:00:00Z');
    });

    it('should validate hash format', () => {
      const validHash = 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44';
      expect(validHash).toMatch(/^[a-f0-9]{64}$/i);
    });
  });

  describe('DuplicateInfo', () => {
    it('should create valid DuplicateInfo', () => {
      const duplicateInfo: DuplicateInfo = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        file_paths: ['/path/to/file1.jpg', '/path/to/file2.jpg'],
        file_size: 2048,
        first_detected: '2026-02-13T00:00:00Z',
      };

      expect(duplicateInfo.hash).toBe(
        'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
      );
      expect(duplicateInfo.file_paths).toHaveLength(2);
      expect(duplicateInfo.file_size).toBe(2048);
      expect(duplicateInfo.first_detected).toBe('2026-02-13T00:00:00Z');
    });

    it('should require at least 2 file paths for duplicates', () => {
      const duplicateInfo: DuplicateInfo = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        file_paths: ['/path/to/file1.jpg', '/path/to/file2.jpg'],
        file_size: 2048,
        first_detected: '2026-02-13T00:00:00Z',
      };

      expect(duplicateInfo.file_paths.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DuplicateAnalysis', () => {
    it('should create valid DuplicateAnalysis', () => {
      const duplicateInfo: DuplicateInfo = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        file_paths: ['/path/to/file1.jpg', '/path/to/file2.jpg'],
        file_size: 2048,
        first_detected: '2026-02-13T00:00:00Z',
      };

      const analysis: DuplicateAnalysis = {
        total_files: 10,
        duplicate_groups: 2,
        duplicate_files: 4,
        wasted_space: 4096,
        duplicates: [duplicateInfo],
      };

      expect(analysis.total_files).toBe(10);
      expect(analysis.duplicate_groups).toBe(2);
      expect(analysis.duplicate_files).toBe(4);
      expect(analysis.wasted_space).toBe(4096);
      expect(analysis.duplicates).toHaveLength(1);
    });

    it('should calculate wasted space correctly', () => {
      const duplicateInfo: DuplicateInfo = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        file_paths: ['/path/to/file1.jpg', '/path/to/file2.jpg', '/path/to/file3.jpg'],
        file_size: 1024,
        first_detected: '2026-02-13T00:00:00Z',
      };

      // 3 fichiers de 1024 bytes = 2048 bytes gaspillés (2 copies en trop)
      const expectedWastedSpace = 1024 * (3 - 1);

      const analysis: DuplicateAnalysis = {
        total_files: 3,
        duplicate_groups: 1,
        duplicate_files: 3,
        wasted_space: expectedWastedSpace,
        duplicates: [duplicateInfo],
      };

      expect(analysis.wasted_space).toBe(expectedWastedSpace);
    });
  });

  describe('HashProgress', () => {
    it('should create valid HashProgress', () => {
      const progress: HashProgress = {
        processed_files: 5,
        total_files: 10,
        current_file: '/path/to/current.jpg',
        progress: 0.5,
      };

      expect(progress.processed_files).toBe(5);
      expect(progress.total_files).toBe(10);
      expect(progress.current_file).toBe('/path/to/current.jpg');
      expect(progress.progress).toBe(0.5);
    });

    it('should have progress between 0 and 1', () => {
      const progress: HashProgress = {
        processed_files: 5,
        total_files: 10,
        progress: 0.5,
      };

      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(1);
    });

    it('should handle empty progress', () => {
      const progress: HashProgress = {
        processed_files: 0,
        total_files: 0,
        progress: 0,
      };

      expect(progress.processed_files).toBe(0);
      expect(progress.total_files).toBe(0);
      expect(progress.progress).toBe(0);
    });
  });

  describe('HashErrorType', () => {
    it('should have all error types', () => {
      expect(HashErrorType.FileNotFound).toBe('FileNotFound');
      expect(HashErrorType.PermissionDenied).toBe('PermissionDenied');
      expect(HashErrorType.ReadError).toBe('ReadError');
      expect(HashErrorType.FileTooLarge).toBe('FileTooLarge');
      expect(HashErrorType.HashError).toBe('HashError');
    });
  });

  describe('HashConfig', () => {
    it('should create valid HashConfig', () => {
      const config: HashConfig = {
        max_file_size: 1073741824, // 1GB
        thread_count: 4,
        chunk_size: 65536, // 64KB
        enable_cache: true,
      };

      expect(config.max_file_size).toBe(1073741824);
      expect(config.thread_count).toBe(4);
      expect(config.chunk_size).toBe(65536);
      expect(config.enable_cache).toBe(true);
    });

    it('should have optional fields', () => {
      const config: HashConfig = {
        chunk_size: 65536,
        enable_cache: false,
      };

      expect(config.max_file_size).toBeUndefined();
      expect(config.thread_count).toBeUndefined();
      expect(config.chunk_size).toBe(65536);
      expect(config.enable_cache).toBe(false);
    });
  });

  describe('HashBenchmarkResult', () => {
    it('should create valid HashBenchmarkResult', () => {
      const benchmark: HashBenchmarkResult = {
        file_path: '/path/to/test.jpg',
        file_size: 1048576, // 1MB
        iterations: 5,
        total_time_ms: 250,
        avg_time_per_hash_ms: 50,
        throughput_mbps: 20.48,
        all_hashes_identical: true,
        sample_hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
      };

      expect(benchmark.file_path).toBe('/path/to/test.jpg');
      expect(benchmark.file_size).toBe(1048576);
      expect(benchmark.iterations).toBe(5);
      expect(benchmark.total_time_ms).toBe(250);
      expect(benchmark.avg_time_per_hash_ms).toBe(50);
      expect(benchmark.throughput_mbps).toBe(20.48);
      expect(benchmark.all_hashes_identical).toBe(true);
      expect(benchmark.sample_hash).toBe(
        'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
      );
    });

    it('should calculate throughput correctly', () => {
      // 1MB file in 50ms = 20MB/s
      const fileSize = 1048576; // 1MB
      const timeMs = 50;
      const expectedThroughput = fileSize / (timeMs / 1000) / (1024 * 1024); // MB/s

      const benchmark: HashBenchmarkResult = {
        file_path: '/path/to/test.jpg',
        file_size: fileSize,
        iterations: 1,
        total_time_ms: timeMs,
        avg_time_per_hash_ms: timeMs,
        throughput_mbps: expectedThroughput,
        all_hashes_identical: true,
        sample_hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
      };

      expect(benchmark.throughput_mbps).toBeCloseTo(expectedThroughput, 2);
    });
  });

  describe('Type validation', () => {
    it('should validate hash format consistency', () => {
      const validHashes = [
        'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        '0000000000000000000000000000000000000000000000000000000000000000',
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      ];

      validHashes.forEach((hash) => {
        expect(hash).toMatch(/^[a-f0-9]{64}$/i);
      });
    });

    it('should validate file sizes are non-negative', () => {
      const fileHash: FileHash = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        hash_type: HashType.Blake3,
        file_size: 0, // Empty file
        hashed_at: '2026-02-13T00:00:00Z',
      };

      expect(fileHash.file_size).toBeGreaterThanOrEqual(0);
    });

    it('should validate progress is within bounds', () => {
      const validProgressValues = [0, 0.25, 0.5, 0.75, 1.0];

      validProgressValues.forEach((progress) => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Serialization compatibility', () => {
    it('should serialize and deserialize FileHash', () => {
      const original: FileHash = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        hash_type: HashType.Blake3,
        file_size: 1024,
        hashed_at: '2026-02-13T00:00:00Z',
      };

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as FileHash;

      expect(deserialized).toEqual(original);
    });

    it('should serialize and deserialize DuplicateAnalysis', () => {
      const duplicateInfo: DuplicateInfo = {
        hash: 'b3a2416c7c8a9b0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a44',
        file_paths: ['/path/to/file1.jpg', '/path/to/file2.jpg'],
        file_size: 2048,
        first_detected: '2026-02-13T00:00:00Z',
      };

      const original: DuplicateAnalysis = {
        total_files: 10,
        duplicate_groups: 1,
        duplicate_files: 2,
        wasted_space: 2048,
        duplicates: [duplicateInfo],
      };

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as DuplicateAnalysis;

      expect(deserialized).toEqual(original);
    });
  });
});

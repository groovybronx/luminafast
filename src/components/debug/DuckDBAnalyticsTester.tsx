/**
 * DuckDB Analytics Tester — Phase 6.2 Integration Verification
 *
 * Temporary debug component to verify Tauri analytics commands work.
 * Can be mounted in App.tsx for manual testing, then removed.
 *
 * Usage:
 * - Import in App.tsx
 * - Mount: <DuckDBAnalyticsTester />
 * - Open DevTools, click buttons, watch logs
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TestResult {
  command: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  result?: unknown;
  error?: string;
}

export function DuckDBAnalyticsTester() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async (command: string, params: Record<string, unknown>) => {
    setLoading(true);
    const testResult: TestResult = { command, status: 'loading' };

    try {
      if (import.meta.env.DEV) {
        console.warn(`[DuckDBTester] Calling ${command}`, params);
      }
      const result = await invoke(command, params);
      testResult.status = 'success';
      testResult.result = result;
      if (import.meta.env.DEV) {
        console.warn(`[DuckDBTester] ${command} succeeded:`, result);
      }
    } catch (error: unknown) {
      testResult.status = 'error';
      testResult.error = error instanceof Error ? error.message : String(error);
      console.error(`[DuckDBTester] ${command} failed:`, error);
    }

    setResults((prev) => [testResult, ...prev.filter((r) => r.command !== command)]);
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 400,
        maxHeight: 600,
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        border: '2px solid #007acc',
        borderRadius: 8,
        padding: 16,
        fontSize: 12,
        fontFamily: 'monospace',
        zIndex: 10000,
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#4ec9b0' }}>
        🔧 DuckDB Analytics Tester
      </div>

      {/* Test Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => runTest('get_aggregations', { groupBy: 'month' })}
          disabled={loading}
          style={buttonStyle}
        >
          📅 Test: Aggregations (month)
        </button>

        <button
          onClick={() => runTest('get_aggregations', { groupBy: 'camera' })}
          disabled={loading}
          style={buttonStyle}
        >
          📷 Test: Aggregations (camera)
        </button>

        <button
          onClick={() => runTest('get_catalog_statistics', {})}
          disabled={loading}
          style={buttonStyle}
        >
          📊 Test: Catalog Statistics
        </button>

        <button
          onClick={() => runTest('execute_smart_query', { queryJson: '{"rules":[]}' })}
          disabled={loading}
          style={buttonStyle}
        >
          🔍 Test: Smart Query
        </button>

        <button
          onClick={() => runTest('sync_duckdb_from_sqlite', {})}
          disabled={loading}
          style={buttonStyle}
        >
          🔄 Test: Sync DuckDB from SQLite
        </button>
      </div>

      {/* Results */}
      <div style={{ borderTop: '1px solid #444', paddingTop: 12 }}>
        <div style={{ color: '#ce9178', marginBottom: 8 }}>Results:</div>
        {results.length === 0 ? (
          <div style={{ color: '#6a9955', fontSize: 11 }}>No tests run yet</div>
        ) : (
          results.map((r, i) => (
            <div
              key={i}
              style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #333' }}
            >
              <div style={{ color: '#569cd6', marginBottom: 4 }}>
                {r.command}{' '}
                <span
                  style={{
                    color:
                      r.status === 'success'
                        ? '#4ec9b0'
                        : r.status === 'error'
                          ? '#f48771'
                          : '#dcdcaa',
                  }}
                >
                  [{r.status}]
                </span>
              </div>
              {r.status === 'success' && (
                <div style={{ color: '#ce9178', fontSize: 10, wordBreak: 'break-all' }}>
                  ✓ {JSON.stringify(r.result).substring(0, 150)}...
                </div>
              )}
              {r.status === 'error' && (
                <div style={{ color: '#f48771', fontSize: 10 }}>✗ {r.error}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  transition: 'background-color 0.2s',
};

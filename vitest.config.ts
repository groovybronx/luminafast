// Correction : déclaration globale pour __dirname
declare const __dirname: string;
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
// Correction : assurez-vous que les types Node.js sont installés
// npm install --save-dev @types/node

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Use --watch flag for development: npm run test:ci -- --watch
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.ts',
        '**/dist/',
        '**/coverage/',
        'src-tauri/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api': path.resolve(__dirname, './src/test/mocks/tauri-api'),
      '@tauri-apps/api/core': path.resolve(__dirname, './src/test/mocks/tauri-api/core'),
      '@tauri-apps/api/event': path.resolve(__dirname, './src/test/mocks/tauri-api/event'),
    },
  },
});

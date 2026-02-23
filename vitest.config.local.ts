/**
 * Local Vitest Configuration
 *
 * This file is git-ignored and used only for local development.
 * To use this config during development, you have two options:
 *
 * 1. Set VITEST_CONFIG environment variable:
 *    VITEST_CONFIG=vitest.config.local.ts npm run test:ci
 *
 * 2. Use the --watch flag directly:
 *    npm run test:ci -- --watch
 *
 * The watch mode will re-run tests when files change, useful for TDD.
 */

import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      watch: true, // Enable watch mode for local development
    },
  }),
);

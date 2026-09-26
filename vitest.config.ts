import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Hard 100% coverage gate, same rule as the 21.gifts API.
 * `src/index.ts` is the process entry and is covered by the HTTP end-to-end run.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/lib/map/sqlite.ts', 'src/**/*.test.ts', 'src/**/__tests__/**'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      all: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

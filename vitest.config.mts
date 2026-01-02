import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster DOM simulation
    environment: 'happy-dom',

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Setup file to run before tests
    setupFiles: ['./vitest.setup.mts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // Only include source files
      include: ['src/hooks/**/*.{ts,tsx}', 'src/contexts/**/*.{ts,tsx}', 'src/app/api/**/*.ts', 'src/lib/**/*.ts'],

      // Exclude test files and types
      exclude: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/node_modules/**', '**/types/**', '**/config/**', '**/*.d.ts'],

      // TODO: Re-enable coverage thresholds once test coverage improves
      // thresholds: {
      //   lines: 70,
      //   functions: 70,
      //   branches: 70,
      //   statements: 70,
      // },
    },

    // Test timeout (useful for async operations)
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,
  },

  // Resolve aliases (match tsconfig paths)
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

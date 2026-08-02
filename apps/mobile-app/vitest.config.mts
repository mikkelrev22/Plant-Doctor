import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest config for the mobile app's pure-function unit tests (API client,
 * query keys, URL helpers, session store). Component tests would need a RN
 * test environment — not used for the prototype, but the code is structured
 * so the data layer stays decoupled and testable in plain node.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@plant-doctor/api-types': path.resolve(
        __dirname,
        '../../libs/api-types/src/index.ts',
      ),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./test.setup.ts'],
  },
});
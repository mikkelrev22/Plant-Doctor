/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/architecture',
  envDir: '../../',
  envPrefix: ['VITE_', 'ARCHITECTURE_', 'BACKEND_'],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 4600,
    host: 'localhost',
  },
  preview: {
    port: 4600,
    host: 'localhost',
  },
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/architecture',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'architecture',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/architecture',
      provider: 'v8' as const,
    },
  },
}));
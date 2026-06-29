/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  envDir: '../../',
  envPrefix: ['VITE_', 'FRONTEND_', 'BACKEND_'],
  resolve: {
    tsconfigPaths: true,
  },
  server:{
    port: 4000,
    host: 'localhost',
  },
  preview:{
    port: 4000,
    host: 'localhost',
  },
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/frontend',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'frontend',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/frontend',
      provider: 'v8' as const,
    }
  },
}));

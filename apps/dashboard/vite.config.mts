/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/dashboard',
  envDir: '../../',
  envPrefix: ['VITE_', 'DASHBOARD_', 'BACKEND_'],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 4500,
    host: 'localhost',
    // Proxy backend traffic through the Vite dev server so the dashboard and
    // API share one origin. This makes dev (and a reverse tunnel to :4500)
    // same-origin — no CORS, no absolute backend URLs baked into the bundle,
    // and the same code works locally and when shared with a colleague.
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
      // Python backend-agent (apps/backend-agent) — streams the AI SDK UI
      // Message Stream from POST /chat/agent/stream. Proxied same-origin (like
      // /api) so the dashboard, dev server, and any reverse tunnel to :4500 all
      // reach it without CORS or an absolute URL in the bundle. http-proxy
      // passes SSE through unchanged.
      '/agent-api': {
        target: 'http://localhost:4300',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/agent-api/, ''),
      },
    },
  },
  preview: {
    port: 4500,
    host: 'localhost',
  },
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/dashboard',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'dashboard',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/dashboard',
      provider: 'v8' as const,
    },
  },
}));

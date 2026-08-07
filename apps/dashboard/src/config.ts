export const config = {
  dashboardUrl: import.meta.env.DASHBOARD_URL ?? 'http://localhost:4500',
  // Base for backend API calls. Routed through the Vite dev proxy in
  // vite.config.mts (/api -> backend, prefix stripped) so the dashboard and
  // backend share one origin — same-origin in dev and when shared over a
  // reverse tunnel to :4500. Override with DASHBOARD_API_BASE to point at a
  // different backend; do NOT reuse the shared BACKEND_URL (that's for the
  // backend's own image URLs and the mobile app, which need an absolute LAN
  // address the dashboard doesn't).
  backendUrl: import.meta.env.DASHBOARD_API_BASE ?? '/api',
  // Static API key sent to the backend as `x-api-key`. Baked into the JS bundle
  // by Vite (BACKEND_API_KEY via the `BACKEND_` envPrefix) — acceptable for now.
  apiKey: import.meta.env.BACKEND_API_KEY ?? '',
} as const;

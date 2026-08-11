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
  // Base for the Python backend-agent (`apps/backend-agent`, port 4300), which
  // streams the AI SDK UI Message Stream from `POST /chat/agent/stream`. Routed
  // through the Vite dev proxy as `/agent-api` (prefix stripped) for the same
  // same-origin + reverse-tunnel reasons as `backendUrl`. The agent authenticates
  // with the same `x-api-key` as the Node backend; CORS is open (credentials off).
  agentUrl: import.meta.env.DASHBOARD_AGENT_BASE ?? '/agent-api',
  // Static API key sent to the backend as `x-api-key`. Baked into the JS bundle
  // by Vite (BACKEND_API_KEY via the `BACKEND_` envPrefix) — acceptable for now.
  apiKey: import.meta.env.BACKEND_API_KEY ?? '',
} as const;

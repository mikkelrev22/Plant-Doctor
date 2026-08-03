export const config = {
  backendUrl: import.meta.env.BACKEND_URL ?? 'http://localhost:4100',
  // Static API key sent to the backend as `x-api-key`. Baked into the JS bundle
  // by Vite (BACKEND_API_KEY via the `BACKEND_` envPrefix) — acceptable for now.
  apiKey: import.meta.env.BACKEND_API_KEY ?? '',
} as const;
export const config = {
  frontendUrl: import.meta.env.FRONTEND_URL ?? 'http://localhost:3000',
  backendUrl: import.meta.env.BACKEND_URL ?? 'http://localhost:3000',
  backendPyUrl: import.meta.env.BACKEND_PY_URL ?? 'http://localhost:3000',
} as const;

export const config = {
  frontendUrl: import.meta.env.FRONTEND_URL ?? 'http://localhost:4000',
  backendUrl: import.meta.env.BACKEND_URL ?? 'http://localhost:4100',
  backendPyUrl: import.meta.env.BACKEND_PY_URL ?? 'http://localhost:4200',
} as const;

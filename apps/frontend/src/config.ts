export const config = {
  frontendUrl: import.meta.env.FRONTEND_URL ?? 'http://localhost:4000',
  backendUrl: import.meta.env.BACKEND_URL ?? 'http://localhost:3000',
} as const;

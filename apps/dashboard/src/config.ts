export const config = {
  dashboardUrl: import.meta.env.DASHBOARD_URL ?? 'http://localhost:4500',
  backendUrl: import.meta.env.BACKEND_URL ?? 'http://localhost:4100',
} as const;

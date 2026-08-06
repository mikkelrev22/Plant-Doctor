/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DASHBOARD_URL: string;
  readonly DASHBOARD_API_BASE?: string;
  readonly BACKEND_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

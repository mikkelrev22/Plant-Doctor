/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DASHBOARD_URL: string;
  readonly BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly FRONTEND_URL: string;
  readonly BACKEND_URL: string;
  readonly BACKEND_PY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

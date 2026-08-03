interface ImportMetaEnv {
  readonly BACKEND_URL: string;
  readonly BACKEND_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env') });

export const config = {
  llmApiUrl: process.env.LLM_API_URL ?? '',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmApiModel: process.env.LLM_API_MODEL ?? '',
  llmMaxTokens: Number(process.env.LLM_MAX_TOKENS ?? 8192),
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120000), // Default 2 minutes
  // Fireworks reasoning effort for the analysis call. 'none' disables Qwen3's
  // thinking block (faster, sufficient for structured JSON output); set to
  // 'low' | 'medium' | 'high' to re-enable reasoning without a code change.
  llmReasoningEffort: process.env.LLM_REASONING_EFFORT ?? 'none',
  // Bind to 0.0.0.0 by default so the server is reachable from sibling Docker
  // containers (e.g. the Caddy reverse proxy). Local dev overrides HOST in .env.
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 4100),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4000',
  dashboardUrl: process.env.DASHBOARD_URL ?? 'http://localhost:4500',
  architectureUrl: process.env.ARCHITECTURE_URL ?? 'http://localhost:4600',
  // Expo web dev server origin, so the mobile prototype (run with `expo start --web`)
  // can call this API from the browser. Native (Expo Go) requests aren't subject
  // to CORS — this only matters for the web target. Match the port Expo prints.
  mobileUrl: process.env.MOBILE_URL ?? 'http://localhost:8081',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4100',
  // Shared static API key checked by the api-key plugin against the
  // `x-api-key` request header. Fail-closed: empty = reject all gated
  // requests. The trusted frontends bundle the same value from BACKEND_API_KEY.
  apiKey: process.env.BACKEND_API_KEY ?? '',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads/plant-photos',
  // File storage. 'local' keeps the original filesystem behaviour for dev;
  // 's3' uploads to an S3 bucket and serves public URLs (staging/prod).
  storageDriver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
  s3Bucket: process.env.S3_BUCKET ?? '',
  s3Region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  s3Prefix: process.env.S3_PREFIX ?? '',
  // Optional; defaults to https://<bucket>.s3.<region>.amazonaws.com.
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://plant_doctor:plant_doctor@localhost:5432/plant_doctor',
} as const;

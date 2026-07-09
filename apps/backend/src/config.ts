import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env') });

export const config = {
  llmApiUrl: process.env.LLM_API_URL ?? '',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmApiModel: process.env.LLM_API_MODEL ?? '',
  llmMaxTokens: Number(process.env.LLM_MAX_TOKENS ?? 8192),
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 120000), // Default 2 minutes
  host: process.env.HOST ?? 'localhost',
  port: Number(process.env.PORT ?? 4100),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4000',
  dashboardUrl: process.env.DASHBOARD_URL ?? 'http://localhost:4500',
  architectureUrl: process.env.ARCHITECTURE_URL ?? 'http://localhost:4600',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4100',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads/plant-photos',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://plant_doctor:plant_doctor@localhost:5432/plant_doctor',
} as const;

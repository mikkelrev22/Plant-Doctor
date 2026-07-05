import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env') });

export const config = {
  llmApiUrl: process.env.LLM_API_URL ?? 'https://api.openai.com/v1',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmApiModel: process.env.LLM_API_MODEL ?? 'gpt-4o-mini',
  host: process.env.HOST ?? 'localhost',
  port: Number(process.env.PORT ?? 4100),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4000',
  dashboardUrl: process.env.DASHBOARD_URL ?? 'http://localhost:4500',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4100',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads/plant-photos',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://plant_doctor:plant_doctor@localhost:5432/plant_doctor',
} as const;

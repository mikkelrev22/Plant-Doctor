import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env') });

export const config = {
  llmApiKey: process.env.LLM_API_KEY ?? '',
  host: process.env.HOST ?? 'localhost',
  port: Number(process.env.PORT ?? 3000),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4000',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://plant_doctor:plant_doctor@localhost:5432/plant_doctor',
} as const;

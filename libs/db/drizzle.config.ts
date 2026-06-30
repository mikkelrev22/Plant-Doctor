import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: './libs/db/src/schema/index.ts',
  out: './libs/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});

import '@fastify/sensible';
import type { Database } from '@plant-doctor/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

import '@fastify/sensible';
import type { Chat, Database } from '@plant-doctor/db';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }

  // Set by the agent-group `preHandler` (agent-auth.ts) after validating the
  // `x-chat-token` header. Present on every /agent request except `createChat`
  // (which has no token yet). Handlers use it to scope tool queries to the
  // chat's plant/user without re-reading the header.
  interface FastifyRequest {
    chat?: Chat;
  }
}
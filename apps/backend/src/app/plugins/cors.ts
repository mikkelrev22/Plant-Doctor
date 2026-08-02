import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../../config';

/**
 * Restricts CORS to the configured browser origins (frontend, dashboard, the
 * architecture diagram app, and the Expo web dev server for the mobile app).
 *
 * CORS governs browser cross-origin requests only — it is not access control.
 * A static `x-api-key` gate is applied in plugins/api-key.ts (stopgap until
 * real auth lands); see that plugin for which routes are exempt.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: [
      config.frontendUrl,
      config.dashboardUrl,
      config.architectureUrl,
      config.mobileUrl,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
});

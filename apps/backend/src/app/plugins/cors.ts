import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../../config';

/**
 * Restricts CORS to the configured frontend and dashboard origins.
 *
 * CORS governs browser cross-origin requests only — it is not access control.
 * Endpoints currently have no authentication, so don't expose this backend
 * publicly without adding auth first.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: [config.frontendUrl, config.dashboardUrl],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
});

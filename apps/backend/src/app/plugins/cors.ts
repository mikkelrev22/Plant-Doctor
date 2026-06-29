import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Permissive CORS for development — tighten before production.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: true,
  });
});

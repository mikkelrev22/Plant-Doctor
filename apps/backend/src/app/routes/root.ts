import { FastifyInstance } from 'fastify';
import { BACKEND_VERSION } from '../../version';

export default async function (fastify: FastifyInstance) {
  // API-key exempt (see plugins/api-key.ts) — doubles as the health/version probe
  // the mobile login screen hits before any auth.
  fastify.get('/', async function () {
    return { message: 'Node.js backend is running', version: BACKEND_VERSION };
  });
}

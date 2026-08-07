import { createDatabaseClient } from '@plant-doctor/db';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../../config';
import '../types/fastify';

export default fp(async function (fastify: FastifyInstance) {
  const client = createDatabaseClient(config.databaseUrl);

  fastify.decorate('db', client.db);
  fastify.addHook('onClose', async () => {
    await client.close();
  });
});

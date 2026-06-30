import { createDatabaseClient, type Database } from '../../../../../libs/db/src';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../../config';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export default fp(async function (fastify: FastifyInstance) {
  const client = createDatabaseClient(config.databaseUrl);

  fastify.decorate('db', client.db);
  fastify.addHook('onClose', async () => {
    await client.close();
  });
});

import Fastify from 'fastify';
import { app } from './app/app';
import { config } from './config';

async function start() {
  const server = Fastify({
    logger: true,
  });

  await server.register(app);

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`[ ready ] ${config.backendUrl}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';
import { config } from '../../config';

export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  const uploadRoot = resolve(process.cwd(), config.uploadDir);

  await mkdir(uploadRoot, { recursive: true });

  await fastify.register(fastifyStatic, {
    root: uploadRoot,
    prefix: '/uploads/plant-photos/',
    decorateReply: false,
  });
});

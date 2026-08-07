import { FastifyInstance } from 'fastify';
import '../types/fastify';
import { listStressSigns } from '../services/stress.service';

export default async function (fastify: FastifyInstance) {
  // Returns the seeded stress checklist and stress-variable taxonomy.
  fastify.get('/stress-signs', async function () {
    return listStressSigns(fastify.db);
  });
}

import { FastifyInstance } from 'fastify';
import '../types/fastify';
import { createPlant, listPlants } from '../services/plants.service';
import { listReportsForPlant } from '../services/reports.service';

function bodyRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export default async function (fastify: FastifyInstance) {
  // Lists preview plants for the Research User dropdown.
  fastify.get('/plants', async function () {
    return listPlants(fastify.db);
  });

  // Creates a plant for the Research User, generating a friendly name if blank.
  fastify.post('/plants', async function (request) {
    const body = bodyRecord(request.body);
    const name = typeof body.name === 'string' ? body.name : undefined;

    return createPlant(fastify.db, name);
  });

  // Returns report history for one Research User plant.
  fastify.get('/plants/:plantId/reports', async function (request) {
    const params = request.params as { plantId?: string };
    const plantId = Number(params.plantId);

    if (!Number.isInteger(plantId)) {
      throw fastify.httpErrors.badRequest('Invalid plant id');
    }

    return listReportsForPlant(fastify.db, plantId);
  });
}

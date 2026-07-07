import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../types/fastify';
import { createPlant, getPlantForUser, listPlants } from '../services/plants.service';
import { listReportsForPlant } from '../services/reports.service';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Lists preview plants for the Research User dropdown.
  server.get('/plants', async function () {
    return listPlants(fastify.db);
  });

  // Creates a plant for the Research User, generating a friendly name if blank.
  server.post(
    '/plants',
    {
      schema: {
        body: z.object({
          name: z.string().optional(),
        }),
      },
    },
    async function (request) {
      const { name } = request.body;

      return createPlant(fastify.db, name);
    }
  );

  // Returns report history for one Research User plant.
  server.get(
    '/plants/:plantId/reports',
    {
      schema: {
        params: z.object({
          plantId: z.coerce.number().int(),
        }),
      },
    },
    async function (request) {
      const { plantId } = request.params;

      return listReportsForPlant(fastify.db, plantId);
    }
  );

  // Returns a single plant by ID.
  server.get(
    '/plants/:plantId',
    {
      schema: {
        params: z.object({
          plantId: z.coerce.number().int(),
        }),
      },
    },
    async function (request) {
      const { plantId } = request.params;
      const plant = await getPlantForUser(fastify.db, plantId);

      if (!plant) {
        throw fastify.httpErrors.notFound('Plant not found');
      }

      return plant;
    }
  );
}

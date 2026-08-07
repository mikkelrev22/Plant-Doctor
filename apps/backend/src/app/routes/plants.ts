import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../types/fastify';
import { createPlant, getPlantForUser, listPlants, listPlantsForEval, updatePlant } from '../services/plants.service';
import {
  listReportsForPlant,
  listReportsForPlantEval,
  listReportsForPlantExtended,
} from '../services/reports.service';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Lists preview plants for the Research User dropdown.
  server.get('/plants', async function () {
    return listPlants(fastify.db);
  });

  // Extended plant list for the eval tool: same fields as GET /plants plus the
  // distinct LLM model names used across each plant's reports. Registered before
  // the parametric /plants/:plantId routes so the static path isn't shadowed.
  // Separate route so it can be disabled in production independently.
  server.get('/plants/evals', async function () {
    return listPlantsForEval(fastify.db);
  });

  // Updates a plant's editable fields (name and/or notes). At least one must be
  // provided; `name` must be non-empty when present, `notes` may be null/blank
  // to clear.
  server.patch(
    '/plants/:plantId',
    {
      schema: {
        params: z.object({
          plantId: z.coerce.number().int(),
        }),
        body: z
          .object({
            name: z.string().min(1).optional(),
            notes: z.string().nullable().optional(),
          })
          .refine((body) => body.name !== undefined || body.notes !== undefined, {
            message: 'Provide at least one of name or notes',
          }),
      },
    },
    async function (request) {
      const { plantId } = request.params;
      const { name, notes } = request.body;

      return updatePlant(fastify.db, plantId, { name, notes });
    }
  );

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

  // Returns report history for one Research User plant, including per-report
  // stress-sign evaluations (used by the over-time stress-sign table). The
  // simpler GET /plants/:plantId/reports above stays available for other uses.
  server.get(
    '/plants/:plantId/reports/extended',
    {
      schema: {
        params: z.object({
          plantId: z.coerce.number().int(),
        }),
      },
    },
    async function (request) {
      const { plantId } = request.params;

      return listReportsForPlantExtended(fastify.db, plantId);
    }
  );

  // Returns report history for one Research User plant, including per-report
  // stress-sign evaluations AND LLM metrics (latency, token usage parsed from
  // response_metadata, model, error) extracted from the llm_requests row for
  // each report. Powers the eval results table, which is reopenable any time.
  server.get(
    '/plants/:plantId/reports/eval',
    {
      schema: {
        params: z.object({
          plantId: z.coerce.number().int(),
        }),
      },
    },
    async function (request) {
      const { plantId } = request.params;

      return listReportsForPlantEval(fastify.db, plantId);
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

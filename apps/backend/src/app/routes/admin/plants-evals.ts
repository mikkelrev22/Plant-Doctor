import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../../types/fastify';
import { listPlantsForEval } from '../../services/plants.service';
import { listReportsForPlantEval } from '../../services/reports.service';
import { plantIdParams } from '../_shared/schemas';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Extended plant list for the eval tool: same fields as GET /plants plus the
  // distinct LLM model names used across each plant's reports. Registered before
  // the parametric /plants/:plantId routes (admin group registers before
  // consumer in app.ts) so the static path isn't shadowed. Separate route so it
  // can be disabled in production independently.
  server.get('/plants/evals', async function () {
    return listPlantsForEval(fastify.db);
  });

  // Returns report history for one Research User plant, including per-report
  // stress-sign evaluations AND LLM metrics (latency, token usage parsed from
  // response_metadata, model, error) extracted from the llm_requests row for
  // each report. Powers the eval results table, which is reopenable any time.
  server.get(
    '/plants/:plantId/reports/eval',
    {
      schema: {
        params: plantIdParams,
      },
    },
    async function (request) {
      const { plantId } = request.params;

      return listReportsForPlantEval(fastify.db, plantId);
    }
  );
}
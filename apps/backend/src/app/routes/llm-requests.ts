import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../types/fastify';
import { getLlmRequestDetail } from '../services/reports.service';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Returns the full LLM request log for one request, including prompt,
  // response, and request/response metadata. Used by the report page's
  // technical request-log table.
  server.get(
    '/llm-requests/:llmRequestId',
    {
      schema: {
        params: z.object({
          llmRequestId: z.coerce.number().int(),
        }),
      },
    },
    async function (request) {
      const { llmRequestId } = request.params;

      const llmRequest = await getLlmRequestDetail(fastify.db, llmRequestId);

      if (!llmRequest) {
        throw fastify.httpErrors.notFound('LLM request not found');
      }

      return llmRequest;
    },
  );
}
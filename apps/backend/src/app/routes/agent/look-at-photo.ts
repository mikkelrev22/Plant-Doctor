import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../../types/fastify';
import { requireChat } from '../../services/agent-auth';
import { agentLookAtPhoto } from '../../services/agent-tools.service';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // agent/lookAtPhoto — answers a free-text question about a report's photo
  // using the vision LLM. Defaults to the chat's default report. Plain text.
  server.post(
    '/lookAtPhoto',
    {
      schema: {
        body: z.object({
          reportId: z.number().int().optional(),
          query: z.string().min(1),
        }),
      },
    },
    async function (request, reply) {
      const { reportId, query } = request.body;
      try {
        const text = await agentLookAtPhoto(fastify.db, requireChat(request), {
          reportId,
          query,
        });
        return reply.type('text/plain; charset=utf-8').send(text);
      } catch (error) {
        // LLM failures are logged inside the service; surface a generic 502 so
        // no provider internals leak (mirrors POST /reports/analyze).
        request.log.error({ err: error }, 'agent lookAtPhoto failed');
        throw fastify.httpErrors.badGateway('Look-at-photo failed');
      }
    },
  );
}
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../../types/fastify';
import { requireChat } from '../../services/agent-auth';
import {
  agentPlantHistory,
  agentPlantReports,
} from '../../services/agent-tools.service';

const plantIdQuery = z.object({
  plantId: z.coerce.number().int().optional(),
});

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // agent/plantReports — last 3 reports with full detail (dates, present &
  // absent stress signs, severity, notes) plus an "N more in history" note.
  // Returns plain text for the agent. Defaults to the chat's bound plant.
  server.get(
    '/plantReports',
    { schema: { querystring: plantIdQuery } },
    async function (request, reply) {
      const { plantId } = request.query;
      const text = await agentPlantReports(fastify.db, requireChat(request), plantId);
      return reply.type('text/plain; charset=utf-8').send(text);
    },
  );

  // agent/plantHistory — every report for the plant, brief (dates, summary,
  // stress signs without notes). Plain text. Defaults to the chat's plant.
  server.get(
    '/plantHistory',
    { schema: { querystring: plantIdQuery } },
    async function (request, reply) {
      const { plantId } = request.query;
      const text = await agentPlantHistory(fastify.db, requireChat(request), plantId);
      return reply.type('text/plain; charset=utf-8').send(text);
    },
  );
}
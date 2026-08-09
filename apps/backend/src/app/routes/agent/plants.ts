import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import '../../types/fastify';
import { requireChat } from '../../services/agent-auth';
import { agentUserPlants } from '../../services/agent-tools.service';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // agent/userPlants — the user's plants (limit 10), with report counts and
  // current stress signs. Plain text. No plant id: always the chat's user.
  server.get('/userPlants', async function (request, reply) {
    const text = await agentUserPlants(fastify.db, requireChat(request));
    return reply.type('text/plain; charset=utf-8').send(text);
  });
}
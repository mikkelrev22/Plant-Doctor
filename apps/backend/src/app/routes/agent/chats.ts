import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import '../../types/fastify';
import { logAgentEvent } from '../../services/agent-tools.service';
import {
  createChat,
  getChat,
  listChatsByPlant,
  saveChat,
} from '../../services/chats.service';
import { chatTokenParams, plantIdParams } from '../_shared/schemas';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // createChat — bootstraps a chat for a plant. No chat token exists yet, so this
  // route opts out of the token preHandler via route config. The mobile app
  // calls it (it already sends x-api-key) and hands the returned token +
  // contextText to the agent to start the session.
  server.post(
    '/chats',
    {
      config: { requireChatToken: false },
      schema: {
        body: z.object({ plantId: z.number().int() }),
      },
    },
    async function (request) {
      const { plantId } = request.body;
      const start = Date.now();
      const result = await createChat(fastify.db, { plantId });
      await logAgentEvent(fastify.db, {
        userId: RESEARCH_USER_ID,
        chatId: null,
        tool: 'createChat',
        requestParams: { plantId },
        responseText: result.contextText,
        latencyMs: Date.now() - start,
      });
      return result;
    },
  );

  // getChat — returns the saved history blob so the agent can resume. The token
  // preHandler has already validated the token and set request.chat.
  server.get(
    '/chats/:chatToken',
    { schema: { params: chatTokenParams } },
    async function (request) {
      const { chatToken } = request.params;
      const start = Date.now();
      const history = await getChat(fastify.db, chatToken);
      if (!history) {
        throw fastify.httpErrors.notFound('Chat not found');
      }
      // History can be large; don't store it in the log row.
      await logAgentEvent(fastify.db, {
        userId: RESEARCH_USER_ID,
        chatId: request.chat?.id ?? null,
        tool: 'getChat',
        requestParams: {},
        latencyMs: Date.now() - start,
      });
      return history;
    },
  );

  // saveChat — overwrites the conversation JSON blob for the chat.
  server.put(
    '/chats/:chatToken',
    {
      schema: {
        params: chatTokenParams,
        body: z.object({ history: z.unknown() }),
      },
    },
    async function (request, reply) {
      const { chatToken } = request.params;
      const { history } = request.body;
      const start = Date.now();
      await saveChat(fastify.db, { chatToken, history });
      await logAgentEvent(fastify.db, {
        userId: RESEARCH_USER_ID,
        chatId: request.chat?.id ?? null,
        tool: 'saveChat',
        requestParams: { historyType: Array.isArray(history) ? 'array' : typeof history },
        latencyMs: Date.now() - start,
      });
      return reply.code(204).send();
    },
  );

  // listChatsByPlant — the plant's chats, newest first. No chat token exists
  // for a "list all" call, so this route opts out of the token preHandler (it
  // scopes by plantId + Research User instead). The mobile app calls this for
  // the "All chats (N)" list; history is not logged (read-only, can be large).
  server.get(
    '/plants/:plantId/chats',
    {
      config: { requireChatToken: false },
      schema: { params: plantIdParams },
    },
    async function (request) {
      const { plantId } = request.params;
      return listChatsByPlant(fastify.db, { plantId });
    },
  );
}
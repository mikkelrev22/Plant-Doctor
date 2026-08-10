import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Chat } from '@plant-doctor/db';
import '../types/fastify';
import { getChatByToken } from './chats.service';

/**
 * Returns the chat row set by {@link agentAuthHook}, throwing if it is missing.
 * The preHandler should always have set it for token-required routes, so this
 * only fires on an invariant violation (mapped to 500 by the error handler).
 */
export function requireChat(request: FastifyRequest): Chat {
  if (!request.chat) {
    throw new Error('Agent chat was not loaded for this request');
  }
  return request.chat;
}

/**
 * Route config flag read by {@link agentAuthHook}. Only `createChat` sets it to
 * `false` — every other `/agent` route requires a valid chat token.
 */
export interface AgentRouteConfig {
  requireChatToken?: boolean;
}

/**
 * Agent-group `preHandler`: validates the `x-chat-token` header against the
 * `chats` table and attaches the resolved chat row to `request.chat`, so tool
 * handlers can scope their queries to the chat's plant/user without re-reading
 * the header.
 *
 * The global `x-api-key` `onRequest` gate (service-level) still runs first; this
 * hook adds per-chat scoping on top. Routes opt out via `config.requireChatToken:
 * false` (only `POST /agent/chats`, which creates the token and so can't present
 * one yet).
 */
export async function agentAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const routeConfig = (request.routeOptions?.config ?? {}) as AgentRouteConfig;
  if (routeConfig.requireChatToken === false) return;

  const token = request.headers['x-chat-token'];
  if (typeof token !== 'string' || token.length === 0) {
    return reply
      .code(401)
      .send({ message: 'Unauthorized: missing chat token' });
  }

  const chat = await getChatByToken(request.server.db, token);
  if (!chat) {
    return reply
      .code(401)
      .send({ message: 'Unauthorized: invalid chat token' });
  }

  request.chat = chat;
}
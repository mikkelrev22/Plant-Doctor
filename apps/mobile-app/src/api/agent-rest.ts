import type { ChatHistoryDto, ChatListItemDto } from '@plant-doctor/api-types';
import { ApiError } from './client';

/**
 * REST client for the Node backend's `/agent` group (chat lifecycle + tools).
 *
 * Distinct from `client.ts` (the `consumer` group) and `agent-client.ts` (the
 * streaming transport to the Python agent). These calls hit the Node backend
 * (`EXPO_PUBLIC_API_URL`) with `x-api-key`; the per-chat GET/PUT also send
 * `x-chat-token` (validated by the agent auth preHandler against the `chats`
 * table). Used by the mobile "All chats" list and chat history load/save.
 *
 * `history` is the AI SDK `UIMessage[]` the mobile saves after each turn and
 * hydrates `useChat` from to reopen a past chat.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4100';
const API_KEY = process.env.EXPO_PUBLIC_BACKEND_API_KEY ?? '';

function withBase(path: string): string {
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
}

function headers(chatToken?: string): Record<string, string> {
  const h: Record<string, string> = { 'x-api-key': API_KEY };
  if (chatToken) h['x-chat-token'] = chatToken;
  return h;
}

async function toJson(res: Response): Promise<never> {
  let body: { message?: string } | undefined;
  try {
    body = (await res.json()) as { message?: string };
  } catch {
    body = undefined;
  }
  throw new ApiError(
    res.status,
    body?.message ?? res.statusText ?? 'Request failed',
  );
}

/** GET /agent/plants/:plantId/chats — the plant's chats, newest first. */
export function listPlantChats(plantId: number): Promise<ChatListItemDto[]> {
  return fetch(withBase(`/agent/plants/${plantId}/chats`), {
    headers: headers(),
  }).then(async (res) => (res.ok ? (res.json() as Promise<ChatListItemDto[]>) : toJson(res)));
}

/** GET /agent/chats/:chatToken — the saved `UIMessage[]` history for a chat. */
export function getChatHistory(chatToken: string): Promise<ChatHistoryDto> {
  return fetch(withBase(`/agent/chats/${chatToken}`), {
    headers: headers(chatToken),
  }).then(async (res) => (res.ok ? (res.json() as Promise<ChatHistoryDto>) : toJson(res)));
}

/** PUT /agent/chats/:chatToken — overwrite the saved `UIMessage[]` history. */
export async function saveChatHistory(
  chatToken: string,
  history: unknown,
): Promise<void> {
  const res = await fetch(withBase(`/agent/chats/${chatToken}`), {
    method: 'PUT',
    headers: { ...headers(chatToken), 'content-type': 'application/json' },
    body: JSON.stringify({ history }),
  });
  if (!res.ok) await toJson(res);
}
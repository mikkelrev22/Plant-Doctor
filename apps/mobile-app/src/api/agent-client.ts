import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';

/**
 * Chat transport for the Python agent service (`apps/backend-agent`), which
 * streams the AI SDK UI Message Stream protocol from `POST /chat/agent/stream`.
 *
 * The agent endpoint takes `{ plant_id, message, thread_id? }` — NOT the AI
 * SDK's default `{ messages }` body — so `prepareSendMessagesRequest` extracts
 * the last user message's text and shapes the body accordingly. `thread_id` is
 * read live via `getThreadId` (backed by the per-plant chat holder) so the
 * transport can be created once per plant and still resume correctly.
 *
 * `body` MUST be returned as a plain object — the AI SDK transport does the
 * `JSON.stringify(body)` itself (exactly once). Returning a string here would
 * double-encode the wire body (`"{\"plant_id\":…}"`) and the server would 422.
 *
 * `expo/fetch` is used (instead of the Hermes default) so SSE streaming works on
 * native. See `docs/backend-agent.md` for the wire protocol.
 */

const AGENT_URL = process.env.EXPO_PUBLIC_AGENT_URL ?? 'http://localhost:4300';
const API_KEY = process.env.EXPO_PUBLIC_BACKEND_API_KEY ?? '';

/** Pull the text a user typed out of a UIMessage's parts (or legacy content). */
function userTextFromMessage(message: {
  content?: string;
  parts?: ReadonlyArray<{ type: string; text?: string }>;
}): string {
  const content = message.content;
  if (typeof content === 'string' && content) return content;
  return (message.parts ?? [])
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('');
}

export function createAgentChatTransport(
  plantId: number,
  getThreadId: () => string | null,
) {
  return new DefaultChatTransport({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: `${AGENT_URL}/chat/agent/stream`,
    headers: { 'x-api-key': API_KEY },
    prepareSendMessagesRequest: ({ messages }) => {
      const last = messages[messages.length - 1];
      const message = last ? userTextFromMessage(last) : '';
      const threadId = getThreadId();
      return {
        body: {
          plant_id: plantId,
          message,
          ...(threadId ? { thread_id: threadId } : {}),
        },
        headers: {
          'x-api-key': API_KEY,
          'content-type': 'application/json',
        },
      };
    },
  });
}
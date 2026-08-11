/**
 * Pure parser + aggregator for the AI SDK UI Message Stream the Python
 * backend-agent emits from `POST /chat/agent/stream`
 * (`apps/backend-agent/src/backend_agent/uimessage.py`).
 *
 * Nothing here touches `fetch` or React, so it can be unit-tested in vitest
 * without a running agent. `AgentStressTestPanel` feeds each streamed chunk to
 * `parseSseChunk` and folds the resulting parts into an `AggregatedResult` via
 * `applyPart`, updating the UI per part so tool-call chips appear live.
 *
 * Wire format: SSE. Each event is `data: <json>\n\n`; the stream ends with the
 * literal `data: [DONE]\n\n`. Part `type`s we care about:
 *   start | start-step | finish-step | finish  -> lifecycle, ignored
 *   text-delta         -> { type, id, delta }            append delta to text
 *   tool-input-available   -> { toolCallId, toolName, input, dynamic }
 *   tool-output-available  -> { toolCallId, output }
 *   data-thread        -> { type:"data-thread", data: { thread_id, chat_token, ... } }
 *   error              -> { type, errorText }
 */

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
}

export interface ThreadMeta {
  thread_id?: string;
  chat_token?: string;
  plant_id?: number;
  plant_name?: string;
  default_report_id?: number | null;
}

export interface AggregatedResult {
  text: string;
  toolCalls: ToolCall[];
  thread?: ThreadMeta;
  error?: string;
  done: boolean;
}

/** A parsed stream part, or the `'DONE'` sentinel for the terminal event. */
export type AgentStreamPart =
  | { type: string; [key: string]: unknown }
  | 'DONE';

export const initialResult: AggregatedResult = {
  text: '',
  toolCalls: [],
  done: false,
};

/**
 * Parse one chunk of SSE text. `buf` is the leftover from the previous chunk
 * (a partial event not yet terminated by a blank line); the returned `rest`
 * is the new leftover to carry into the next call. Events are separated by a
 * blank line (`\n\n`); only `data:` lines are consumed (the server emits one
 * per event). `data: [DONE]` yields the `'DONE'` sentinel. Unparseable payloads
 * are silently dropped so a malformed event never kills the whole run.
 */
export function parseSseChunk(
  chunk: string,
  buf: string,
): { parts: AgentStreamPart[]; rest: string } {
  const combined = buf + chunk;
  const events = combined.split('\n\n');
  // The final element is whatever follows the last blank line — either a
  // partial event (hold it back) or '' (a complete event ended the chunk).
  const rest = events.pop() ?? '';
  const parts: AgentStreamPart[] = [];

  for (const event of events) {
    const dataLines = event.split('\n').filter((l) => l.startsWith('data:'));
    if (dataLines.length === 0) continue;
    // SSE joins multiple `data:` lines with `\n`; the agent only ever emits one.
    const payload = dataLines.map((l) => l.slice(5).replace(/^ /, '')).join('\n');
    if (payload === '[DONE]') {
      parts.push('DONE');
      continue;
    }
    if (!payload) continue;
    try {
      parts.push(JSON.parse(payload) as { type: string; [key: string]: unknown });
    } catch {
      // Ignore malformed event — keep streaming.
    }
  }

  return { parts, rest };
}

/**
 * Fold one parsed part into an `AggregatedResult`. Returns a new object so the
 * caller can feed it straight to `setState`. Unknown part types are no-ops.
 */
export function applyPart(
  state: AggregatedResult,
  part: AgentStreamPart,
): AggregatedResult {
  if (part === 'DONE') return { ...state, done: true };
  const p = part as { type: string; [key: string]: unknown };
  switch (p.type) {
    case 'text-delta':
      return { ...state, text: state.text + String(p.delta ?? '') };
    case 'tool-input-available':
      return {
        ...state,
        toolCalls: [
          ...state.toolCalls,
          {
            toolCallId: String(p.toolCallId ?? ''),
            toolName: String(p.toolName ?? ''),
            input: p.input,
          },
        ],
      };
    case 'tool-output-available':
      return {
        ...state,
        toolCalls: state.toolCalls.map((tc) =>
          tc.toolCallId === String(p.toolCallId ?? '')
            ? { ...tc, output: p.output }
            : tc,
        ),
      };
    case 'data-thread':
      return { ...state, thread: p.data as ThreadMeta };
    case 'error':
      return { ...state, error: String(p.errorText ?? '') };
    default:
      return state;
  }
}
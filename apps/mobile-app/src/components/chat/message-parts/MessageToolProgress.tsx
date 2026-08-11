import type { DynamicToolUIPart } from 'ai';
import { ToolProgress, type ToolProgressPart } from '../ToolProgress';

/** Adapts a `dynamic-tool` part (the AI SDK's shape for a server-side tool call
 * surfaced to the UI) to the {@link ToolProgress} card. The agent runs its
 * tools server-side, so the only states that reach the client here are
 * `output-available` (done) and `output-error` (failed) once the batched
 * response arrives. */
export function MessageToolProgress({ part }: { part: DynamicToolUIPart }) {
  const tp: ToolProgressPart = {
    toolName: part.toolName,
    state: part.state,
    output: part.output,
    errorText: part.errorText,
  };
  return <ToolProgress part={tp} />;
}
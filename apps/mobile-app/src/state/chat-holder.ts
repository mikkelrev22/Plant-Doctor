import { create } from 'zustand';

/**
 * Per-plant LangGraph thread ids, so a chat can resume across screen
 * navigations / app restarts-in-memory. The `thread_id` arrives in the agent
 * stream's `data-thread` part (see `onData` in the chat screen) and is sent back
 * on follow-up turns to resume the same LangGraph thread.
 *
 * Not persisted — the agent's MemorySaver is in-process too, so a full app
 * restart starts a fresh thread anyway. (Swap in a persistent checkpointer on
 * the agent to make this worth persisting.)
 */
interface ChatHolderState {
  threads: Record<number, string>;
  getThreadId: (plantId: number) => string | null;
  setThreadId: (plantId: number, threadId: string) => void;
  clear: (plantId: number) => void;
}

export const useChatHolder = create<ChatHolderState>((set, get) => ({
  threads: {},
  getThreadId: (plantId) => get().threads[plantId] ?? null,
  setThreadId: (plantId, threadId) =>
    set((s) => ({ threads: { ...s.threads, [plantId]: threadId } })),
  clear: (plantId) =>
    set((s) => {
      const next = { ...s.threads };
      delete next[plantId];
      return { threads: next };
    }),
}));
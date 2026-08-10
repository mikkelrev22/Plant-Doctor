import { useLocalSearchParams } from 'expo-router';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { z } from 'zod';
import type { AgentPhotoRequestPartData } from '@plant-doctor/api-types';
import { createAgentChatTransport } from '@/api/agent-client';
import { ImageSourcePicker } from '@/components/capture/ImageSourcePicker';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import type { AgentChatData, AgentUIMessage } from '@/components/chat/agent-chat-types';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useChatHistory, useSaveChatHistory } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useWebModalA11y } from '@/hooks/use-web-modal-a11y';
import { useChatHolder } from '@/state/chat-holder';

/**
 * Per-plant agent chat. The agent (`apps/backend-agent`) streams the AI SDK UI
 * Message Stream protocol; `useChat` consumes it via an `expo/fetch`-backed
 * transport. The server mints the chat token, so the mobile only sends
 * `{ plant_id, message, thread_id? }` (see `agent-client.ts`).
 *
 * `thread_id` (== `chatToken`, see `chat.py`) arrives in the `data-thread` part
 * and is stashed in `chat-holder` per plant so follow-ups resume the same thread.
 *
 * Two entry modes:
 *  - **Ask (new chat):** routed with `q` — sent once on mount; the first turn
 *    mints a fresh chat token.
 *  - **Reopen (old chat):** routed with `chatToken` — the saved `UIMessage[]`
 *    history is loaded via `useChatHistory` and set into `useChat` so the prior
 *    conversation renders; follow-ups resume the same thread.
 *
 * After each assistant turn, the current messages are persisted to the backend
 * (`PUT /agent/chats/:chatToken`) so the "All chats" list preview + reopen
 * hydration keep working across app restarts.
 */
export default function ChatScreen() {
  const user = useRequireAuth();
  const { plantId: plantIdParam, q, chatToken: chatTokenParam } =
    useLocalSearchParams<{ plantId: string; q?: string; chatToken?: string }>();
  const plantId = Number(plantIdParam);
  const reactId = useId();

  // `chatToken` present ⇒ reopening an existing chat (isolated `useChat` state
  // per chat). Absent ⇒ a fresh Ask; a unique per-mount id keeps repeated Asks
  // from sharing message state.
  const chatId = chatTokenParam ? `chat-${chatTokenParam}` : `new-${plantId}-${reactId}`;

  const transport = useMemo(
    () =>
      createAgentChatTransport(plantId, () =>
        useChatHolder.getState().getThreadId(plantId),
      ),
    [plantId],
  );

  const saveChat = useSaveChatHistory();
  const { data: history } = useChatHistory(chatTokenParam);

  const { messages, status, sendMessage, setMessages, stop } = useChat<
    UIMessage<unknown, AgentChatData>
  >({
    id: chatId,
    transport,
    dataPartSchemas,
    onData: (part) => {
      if (part.type === 'data-thread') {
        // thread_id == chatToken (see chat.py); stash it so follow-ups resume
        // and so the post-turn save targets the right chat row.
        useChatHolder.getState().setThreadId(plantId, part.data.thread_id);
      }
    },
    onFinish: ({ messages: finishedMessages }) => {
      // Persist the full conversation after each assistant turn so the All-chats
      // preview + reopen hydration stay current. No-op until the first turn has
      // minted a chatToken (stashed in the holder via onData above).
      const chatToken = useChatHolder.getState().getThreadId(plantId);
      if (chatToken) saveChat.mutate({ chatToken, messages: finishedMessages });
    },
    onError: (err) => console.error('[agent chat]', err),
  });

  const hydratedRef = useRef(false);
  const sentQRef = useRef(false);
  const [photoReq, setPhotoReq] = useState<AgentPhotoRequestPartData | null>(null);
  useWebModalA11y(photoReq !== null);

  // Reopen: hydrate the saved history once it loads, and make this chat the
  // plant's active thread so follow-ups resume it.
  useEffect(() => {
    if (chatTokenParam && history?.history && !hydratedRef.current) {
      hydratedRef.current = true;
      useChatHolder.getState().setThreadId(plantId, chatTokenParam);
      setMessages(history.history as AgentUIMessage[]);
    }
  }, [chatTokenParam, history, plantId, setMessages]);

  // Ask: send the prefilled question once on mount (only for new chats), once
  // auth has resolved.
  useEffect(() => {
    if (user && q && !sentQRef.current && !chatTokenParam) {
      sentQRef.current = true;
      void sendMessage({ text: q });
    }
  }, [user, q, chatTokenParam, sendMessage]);

  if (!user) return null;

  const handleReply = (text: string) => {
    void sendMessage({ text });
  };

  // The agent endpoint only accepts text today, so a photo picked here is sent
  // as a text stand-in ("I just shared another photo…"). Wiring the image bytes
  // into the agent needs a new gateway tool — see the plan's open decisions.
  const handlePhotoSelected = () => {
    setPhotoReq(null);
    void sendMessage({ text: 'I just shared another photo of the plant.' });
  };

  return (
    <Screen style={styles.screen} bodyStyle={styles.screenBody}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ChatMessageList
          messages={messages as AgentUIMessage[]}
          status={status}
          onReply={handleReply}
          onPhotoRequest={setPhotoReq}
        />
        <ChatComposer status={status} onSend={handleReply} onStop={stop} />
      </KeyboardAvoidingView>

      <Modal visible={photoReq !== null} animationType="slide" onRequestClose={() => setPhotoReq(null)}>
        <Screen style={styles.modalScreen} bodyStyle={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Take another photo</Text>
            <Pressable onPress={() => setPhotoReq(null)} style={({ pressed }) => pressed && styles.dimmed}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
          {photoReq ? <Text style={styles.modalPrompt}>{photoReq.prompt}</Text> : null}
          <ImageSourcePicker onImageSelected={handlePhotoSelected} />
        </Screen>
      </Modal>
    </Screen>
  );
}

/**
 * Zod schemas for the custom `data-*` parts. These gate which data parts are
 * retained on `message.parts` (and validate them); the `AgentChatData` generic
 * on `useChat` carries the TypeScript types. Schemas match the agent's emitted
 * shapes exactly (see `Agent*PartData` in api-types).
 */
const dataPartSchemas = {
  thread: z.object({
    thread_id: z.string(),
    chat_token: z.string().optional(),
    plant_id: z.number().optional(),
    plant_name: z.string().optional(),
    default_report_id: z.number().nullable().optional(),
  }),
  yesno: z.object({
    id: z.string(),
    prompt: z.string(),
    type: z.literal('yesno').optional(),
  }),
  questionnaire: z.object({
    id: z.string(),
    title: z.string().optional(),
    questions: z.array(
      z.object({ id: z.string(), text: z.string(), options: z.array(z.string()) }),
    ),
  }),
  'photo-request': z.object({ id: z.string(), prompt: z.string() }),
};

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  screenBody: { paddingHorizontal: 0, paddingVertical: 0 },
  flex: { flex: 1 },
  modalScreen: { paddingTop: theme.spacing.sm },
  modalBody: { paddingHorizontal: 0 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  modalTitle: { ...theme.typography.subtitle, color: theme.colors.leafDark, fontWeight: '700' },
  modalPrompt: { ...theme.typography.body, color: theme.colors.text, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  cancel: { ...theme.typography.body, color: theme.colors.leaf, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
});
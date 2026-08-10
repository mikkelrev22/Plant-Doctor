import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useChatHolder } from '@/state/chat-holder';

/**
 * Per-plant agent chat. The agent (`apps/backend-agent`) streams the AI SDK UI
 * Message Stream protocol; `useChat` consumes it via an `expo/fetch`-backed
 * transport. The server mints the chat token, so the mobile only sends
 * `{ plant_id, message, thread_id? }` (see `agent-client.ts`).
 *
 * `thread_id` arrives in the `data-thread` part and is stashed in `chat-holder`
 * per plant so a reopened chat resumes the same LangGraph thread.
 */
export default function ChatScreen() {
  const user = useRequireAuth();
  const { plantId: plantIdParam } = useLocalSearchParams<{ plantId: string }>();
  const plantId = Number(plantIdParam);

  const transport = useMemo(
    () =>
      createAgentChatTransport(plantId, () =>
        useChatHolder.getState().getThreadId(plantId),
      ),
    [plantId],
  );

  const { messages, status, sendMessage, stop } = useChat<
    UIMessage<unknown, AgentChatData>
  >({
    id: `plant-${plantId}`,
    transport,
    dataPartSchemas,
    onData: (part) => {
      if (part.type === 'data-thread') {
        useChatHolder.getState().setThreadId(plantId, part.data.thread_id);
      }
    },
    onError: (err) => console.error('[agent chat]', err),
  });

  const [photoReq, setPhotoReq] = useState<AgentPhotoRequestPartData | null>(null);

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
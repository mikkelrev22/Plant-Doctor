import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import type { AgentPhotoRequestPartData } from '@plant-doctor/api-types';
import { theme } from '@/constants/theme';
import { MessageBubble } from './MessageBubble';
import type { AgentUIMessage } from './agent-chat-types';

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

interface ChatMessageListProps {
  messages: AgentUIMessage[];
  status: ChatStatus;
  onReply: (text: string) => void;
  onPhotoRequest: (part: AgentPhotoRequestPartData) => void;
}

const SUGGESTIONS = [
  "What's wrong with my plant?",
  'Summarize the latest report',
  'What should I do next?',
];

/**
 * Inverted `FlatList` of chat messages. Inverted keeps the newest message at the
 * bottom and the viewport pinned there as tokens stream in, without manual
 * scroll-to-bottom bookkeeping. A synthetic "Thinking…" bubble is appended while
 * the request is `submitted` (before the assistant message exists).
 *
 * Token-batch throttling (~50ms) is intentionally omitted — typical agent
 * responses are short enough that per-token re-renders are smooth on Hermes; add
 * a `useBatchedTokens` hook if long answers start to jank.
 */
export function ChatMessageList({ messages, status, onReply, onPhotoRequest }: ChatMessageListProps) {
  const pending = status === 'submitted';
  const data: AgentUIMessage[] = pending
    ? [...messages, { id: '__pending__', role: 'assistant', parts: [] } as AgentUIMessage]
    : messages;

  const renderItem: ListRenderItem<AgentUIMessage> = ({ item, index }) => (
    <MessageBubble
      message={item}
      isStreaming={(status === 'streaming' || pending) && index === data.length - 1}
      onReply={onReply}
      onPhotoRequest={onPhotoRequest}
    />
  );

  if (messages.length === 0 && status === 'ready') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Ask the plant doctor</Text>
        <Text style={styles.emptySubtitle}>
          Anything about this plant — recent findings, what to do next, or a sign you noticed.
        </Text>
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => onReply(s)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.dimmed]}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      inverted={messages.length > 0}
      contentContainerStyle={styles.listPad}
    />
  );
}

const styles = StyleSheet.create({
  listPad: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md },
  emptyTitle: { ...theme.typography.title, color: theme.colors.leafDark, textAlign: 'center' },
  emptySubtitle: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  suggestions: { gap: theme.spacing.sm, alignItems: 'center', marginTop: theme.spacing.sm },
  suggestion: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
  },
  suggestionText: { ...theme.typography.body, color: theme.colors.leaf, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
});
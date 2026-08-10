import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ChatListItemDto } from '@plant-doctor/api-types';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { usePlantChats } from '@/hooks/queries';

/**
 * The plant's chats list — loading, empty, and row states. Shared between the
 * native modal route (`app/chats/[plantId]`) and the web popup
 * (`ChatsSheet`). Owns no header or overlay; the wrapper renders chrome and
 * supplies `onChatSelected` for navigation, so this component stays
 * routing-agnostic.
 */
export function ChatsListBody({
  plantId,
  onChatSelected,
}: {
  plantId: number;
  onChatSelected: (chat: ChatListItemDto) => void;
}) {
  const { data: chats, isLoading } = usePlantChats(plantId);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {isLoading ? (
        <Spinner label="Loading chats…" />
      ) : chats && chats.length > 0 ? (
        <View style={styles.list}>
          {chats.map((chat) => (
            <ChatRow key={chat.id} chat={chat} onSelect={onChatSelected} />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No chats yet</Text>
      )}
    </ScrollView>
  );
}

function ChatRow({
  chat,
  onSelect,
}: {
  chat: ChatListItemDto;
  onSelect: (chat: ChatListItemDto) => void;
}) {
  const label = chat.lastMessagePreview
    ? `${formatWhen(chat.createdAt)} — ${chat.lastMessagePreview}`
    : formatWhen(chat.createdAt);

  return (
    <Pressable onPress={() => onSelect(chat)} style={({ pressed }) => [styles.row, pressed && styles.dimmed]}>
      <Text style={styles.rowLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact absolute-time format, e.g. "Aug 10, 3:45 PM". */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  list: { gap: 0 },
  row: {
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowLabel: { ...theme.typography.body, color: theme.colors.text },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.xl,
    textAlign: 'center',
  },
  dimmed: { opacity: 0.5 },
});
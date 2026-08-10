import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChatListItemDto } from '@plant-doctor/api-types';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantChats } from '@/hooks/queries';
import { useWebModalA11y } from '@/hooks/use-web-modal-a11y';

/**
 * Bottom sheet listing a plant's chats. A transparent React Native `Modal`
 * (the repo's overlay idiom — no bottom-sheet library is installed) slides up
 * from the bottom with a tappable backdrop. Each row is labeled with the
 * chat's start date/time and the beginning of its last message; tapping a row
 * opens that chat (hydrating its saved history) and closes the sheet.
 */
export function ChatsSheet({
  plantId,
  visible,
  onClose,
}: {
  plantId: number;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data: chats, isLoading } = usePlantChats(plantId);
  useWebModalA11y(visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[styles.sheet, { paddingBottom: theme.spacing.xl + insets.bottom }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>All chats</Text>
            <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.dimmed}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          {isLoading ? (
            <Spinner label="Loading chats…" />
          ) : chats && chats.length > 0 ? (
            <View style={styles.list}>
              {chats.map((chat) => (
                <ChatRow key={chat.id} chat={chat} plantId={plantId} onClose={onClose} />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No chats yet</Text>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

function ChatRow({
  chat,
  plantId,
  onClose,
}: {
  chat: ChatListItemDto;
  plantId: number;
  onClose: () => void;
}) {
  const label = chat.lastMessagePreview
    ? `${formatWhen(chat.createdAt)} — ${chat.lastMessagePreview}`
    : formatWhen(chat.createdAt);

  const open = () => {
    onClose();
    router.push({
      pathname: '/chat/[plantId]',
      params: { plantId: String(plantId), chatToken: chat.chatToken },
    });
  };

  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.row, pressed && styles.dimmed]}>
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: theme.colors.creamSurface,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  title: { ...theme.typography.subtitle, color: theme.colors.leafDark, fontWeight: '700' },
  close: { ...theme.typography.body, color: theme.colors.leaf, fontWeight: '600' },
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
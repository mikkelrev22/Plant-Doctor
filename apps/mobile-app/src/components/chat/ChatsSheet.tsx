import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChatsListBody } from '@/components/chat/ChatsListBody';
import { theme } from '@/constants/theme';
import { useWebModalA11y } from '@/hooks/use-web-modal-a11y';

/**
 * Web-only "All chats" popup. On native the chats list is the modal route
 * `app/chats/[plantId]` (real iOS/Android sheet via `presentation: 'modal'`),
 * which doesn't render as an overlay on web — so on web the Plant page opens
 * this centered dialog instead. A transparent React Native `Modal` (rendered
 * by react-native-web) shows a dimmed backdrop + a rounded card containing the
 * shared `ChatsListBody`; tapping a row closes the dialog and opens that chat.
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
  useWebModalA11y(visible);

  const selectChat = (chatToken: string) => {
    onClose();
    router.push({
      pathname: '/chat/[plantId]',
      params: { plantId: String(plantId), chatToken },
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={styles.card}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>All chats</Text>
            <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.dimmed}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <ChatsListBody plantId={plantId} onChatSelected={(c) => selectChat(c.chatToken)} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: theme.colors.creamSurface,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    overflow: 'hidden',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    // Subtle elevation/shadow for the floating card.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  title: { ...theme.typography.subtitle, color: theme.colors.leafDark, fontWeight: '700' },
  close: { ...theme.typography.body, color: theme.colors.leaf, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
});
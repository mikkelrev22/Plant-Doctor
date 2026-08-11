import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useChatHolder } from '@/state/chat-holder';

const DEFAULT_QUESTION = "What's wrong with my plant?";
const DEFAULT_PLACEHOLDER = 'Ask the plant doctor anything…';

interface AskBlockProps {
  plantId: number;
  /** Pin the chat to a specific report instead of the plant's latest report,
   *  so the user can ask about an older report. */
  reportId?: number;
  /** Prefilled, editable question (sent on mount when the chat screen opens). */
  initialQuestion?: string;
  placeholder?: string;
}

/**
 * The chat-starter form: an editable prefilled question + an "Ask" button.
 * Submitting clears the plant's active thread (so the first turn mints a fresh
 * chat) and pushes to `/chat/[plantId]` with the question as `q` (auto-sent on
 * mount). When `reportId` is given the chat is pinned to that report instead of
 * the plant's latest report.
 *
 * Extracted from the plant page so the report page can reuse the same starter
 * for "ask about this report".
 */
export function AskBlock({
  plantId,
  reportId,
  initialQuestion = DEFAULT_QUESTION,
  placeholder = DEFAULT_PLACEHOLDER,
}: AskBlockProps) {
  const [askText, setAskText] = useState(initialQuestion);

  const onAsk = () => {
    const text = askText.trim();
    if (!text) return;
    useChatHolder.getState().clear(plantId);
    router.push({
      pathname: '/chat/[plantId]',
      params: {
        plantId: String(plantId),
        q: text,
        ...(reportId != null ? { reportId: String(reportId) } : {}),
      },
    });
  };

  return (
    <View style={styles.askBlock}>
      <TextInput
        value={askText}
        onChangeText={setAskText}
        multiline
        style={styles.askInput}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        maxLength={500}
      />
      <Pressable
        onPress={onAsk}
        disabled={!askText.trim()}
        style={({ pressed }) => [
          styles.askButton,
          !askText.trim() && styles.askButtonDisabled,
          pressed && styles.dimmed,
        ]}
      >
        <Text style={styles.askButtonLabel}>Ask</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  askBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm },
  askInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  askButton: {
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  askButtonDisabled: { backgroundColor: theme.colors.border },
  askButtonLabel: { ...theme.typography.body, color: theme.colors.creamSurface, fontWeight: '700' },
  dimmed: { opacity: 0.6 },
});
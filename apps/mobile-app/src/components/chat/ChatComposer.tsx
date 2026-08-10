import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { ChatStatus } from './ChatMessageList';

interface ChatComposerProps {
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop: () => void;
}

/**
 * Message input row. `Send` is disabled while empty or while a request is
 * `submitted`; while `streaming`, `Send` is replaced by `Stop` (calls
 * `useChat().stop`). The host wraps this in a `KeyboardAvoidingView`.
 */
export function ChatComposer({ status, onSend, onStop }: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const streaming = status === 'streaming';
  const submitted = status === 'submitted';
  const canSend = draft.trim().length > 0 && !submitted && !streaming;

  const send = () => {
    if (!canSend) return;
    const text = draft.trim();
    setDraft('');
    onSend(text);
  };

  return (
    <View style={styles.composer}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Message the plant doctor…"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        style={styles.input}
        underlineColorAndroid="transparent"
        editable={!submitted}
      />
      {streaming ? (
        <Pressable onPress={onStop} style={({ pressed }) => [styles.sendBtn, pressed && styles.dimmed]}>
          <Text style={styles.stopText}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable onPress={send} disabled={!canSend} style={({ pressed }) => [styles.sendBtn, pressed && styles.dimmed, !canSend && styles.disabled]}>
          <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>Send</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.cream,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'center',
  },
  sendBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendText: { ...theme.typography.subtitle, color: theme.colors.leaf, fontWeight: '700' },
  sendTextDisabled: { color: theme.colors.textMuted },
  stopText: { ...theme.typography.subtitle, color: theme.colors.coral, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  dimmed: { opacity: 0.5 },
});
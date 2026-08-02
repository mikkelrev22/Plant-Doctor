import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';

interface InlineTextInputProps {
  /** Current value to edit. */
  value: string;
  /** Called with the committed value when the user submits (enter / save). */
  onSubmit: (value: string) => void;
  /** Called when the user cancels (tap outside / cancel). */
  onCancel: () => void;
  /** Optional inline error message shown beneath the field. */
  error?: string | null;
  placeholder?: string;
}

/**
 * Inline edit field used for plant renaming. Renders its own "Save"/"Cancel"
 * controls so the host screen doesn't need to manage focus. `value` is the
 * initial value; internal state holds the working copy.
 */
export function InlineTextInput({
  value,
  onSubmit,
  onCancel,
  error,
  placeholder,
}: InlineTextInputProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === value) {
      onCancel();
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder={placeholder}
          style={[styles.input, error && styles.inputError]}
          underlineColorAndroid="transparent"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Pressable onPress={submit} style={({ pressed }) => pressed && styles.dimmed}>
          <Text style={styles.action}>Save</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={({ pressed }) => pressed && styles.dimmed}>
          <Text style={[styles.action, styles.cancel]}>Cancel</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  input: {
    flex: 1,
    ...theme.typography.subtitle,
    color: theme.colors.text,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  inputError: { borderColor: theme.colors.danger },
  action: { ...theme.typography.body, color: theme.colors.leaf, fontWeight: '600' },
  cancel: { color: theme.colors.textMuted },
  error: { ...theme.typography.caption, color: theme.colors.danger, marginLeft: theme.spacing.xs },
  dimmed: { opacity: 0.5 },
});
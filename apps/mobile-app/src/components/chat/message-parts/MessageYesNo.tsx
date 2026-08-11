import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AgentYesNoPartData } from '@plant-doctor/api-types';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

interface MessageYesNoProps {
  part: AgentYesNoPartData;
  /** Sends the user's choice as their next message. */
  onReply: (text: string) => void;
}

/** `data-yesno` part — a binary question the agent asks. Renders Yes/No buttons
 * that call `onReply("Yes"|"No")` once, then disable themselves. */
export function MessageYesNo({ part, onReply }: MessageYesNoProps) {
  const [answered, setAnswered] = useState(false);
  const answer = (choice: string) => {
    if (answered) return;
    setAnswered(true);
    onReply(choice);
  };
  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>{part.prompt}</Text>
      <View style={styles.buttonRow}>
        <View style={styles.half}>
          <Button title="Yes" variant="primary" fullWidth disabled={answered} onPress={() => answer('Yes')} />
        </View>
        <View style={styles.half}>
          <Button title="No" variant="secondary" fullWidth disabled={answered} onPress={() => answer('No')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.spacing.sm },
  prompt: { ...theme.typography.body, color: theme.colors.text, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 },
});
import { StyleSheet, Text } from 'react-native';
import type { ReasoningUIPart } from 'ai';
import { theme } from '@/constants/theme';

/** A `reasoning` part — the model's chain-of-thought, shown as muted italics. */
export function MessageReasoning({ part }: { part: ReasoningUIPart }) {
  if (!part.text) return null;
  return <Text style={styles.reasoning}>{part.text}</Text>;
}

const styles = StyleSheet.create({
  reasoning: { ...theme.typography.caption, fontStyle: 'italic', color: theme.colors.textMuted },
});
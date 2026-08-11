import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AgentQuestionnairePartData } from '@plant-doctor/api-types';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

interface MessageQuestionnaireProps {
  part: AgentQuestionnairePartData;
  /** Sends the assembled answers as the user's next message. */
  onReply: (text: string) => void;
}

/** `data-questionnaire` part — a short multi-question form. Each question
 * allows a single selection; on submit the answers are packed as
 * `Q: …\nA: …` lines (with the title prefix, if any) and sent via `onReply`.
 * Disables itself after sending. */
export function MessageQuestionnaire({ part, onReply }: MessageQuestionnaireProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const allAnswered = part.questions.every((q) => selections[q.id]);
  const submit = () => {
    if (!allAnswered || sent) return;
    setSent(true);
    const body = part.questions
      .map((q) => `Q: ${q.text}\nA: ${selections[q.id]}`)
      .join('\n\n');
    onReply(part.title ? `${part.title}\n\n${body}` : body);
  };
  return (
    <View style={styles.root}>
      {part.title ? <Text style={styles.prompt}>{part.title}</Text> : null}
      {part.questions.map((q) => (
        <View key={q.id} style={styles.question}>
          <Text style={styles.questionText}>{q.text}</Text>
          <View style={styles.optionWrap}>
            {q.options.map((opt) => {
              const selected = selections[q.id] === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => (sent ? undefined : setSelections((s) => ({ ...s, [q.id]: opt })))}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.dimmed,
                  ]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Button title="Send answers" variant="primary" fullWidth disabled={!allAnswered || sent} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.spacing.sm },
  prompt: { ...theme.typography.body, color: theme.colors.text, fontWeight: '600' },
  question: { gap: theme.spacing.xs },
  questionText: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '600' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  option: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
    backgroundColor: 'transparent',
  },
  optionSelected: { backgroundColor: theme.colors.leaf },
  optionText: { ...theme.typography.caption, color: theme.colors.leaf, fontWeight: '600' },
  optionTextSelected: { color: theme.colors.creamSurface },
  dimmed: { opacity: 0.5 },
});
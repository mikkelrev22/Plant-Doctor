import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AgentPhotoRequestPartData, AgentQuestionnairePartData } from '@plant-doctor/api-types';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { ToolProgress, type ToolProgressPart } from './ToolProgress';
import type { AgentUIMessage } from './agent-chat-types';

interface MessageBubbleProps {
  message: AgentUIMessage;
  /** True while this message is the one currently streaming from the agent. */
  isStreaming: boolean;
  /** Send the user's reply as their next message (used by yes/no + questionnaire). */
  onReply: (text: string) => void;
  /** The user tapped a "take another photo" request — host opens the picker. */
  onPhotoRequest: (part: AgentPhotoRequestPartData) => void;
}

/**
 * Renders one chat message by switching on `message.parts`:
 *  - `text`              → a bubble
 *  - `dynamic-tool`      → a {@link ToolProgress} card (tool/reasoning progress)
 *  - `data-yesno`        → Yes/No buttons → `onReply("Yes"|"No")`
 *  - `data-questionnaire`→ a mini form → answers sent as one `onReply` message
 *  - `data-photo-request`→ a button → `onPhotoRequest` (host opens the picker)
 *
 * User messages are right-aligned (leaf); assistant messages left-aligned
 * (cream). The custom interactive parts only appear on assistant messages.
 */
function MessageBubbleImpl({ message, isStreaming, onReply, onPhotoRequest }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const textParts = message.parts.filter((p) => p.type === 'text');
  const hasText = textParts.some((p) => p.type === 'text' && p.text.length > 0);
  const showThinking = isStreaming && !isUser && !hasText && message.parts.length === 0;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {showThinking ? <Thinking /> : null}
        {message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return part.text ? (
                <Text key={i} style={isUser ? styles.userText : styles.assistantText}>
                  {part.text}
                  {isStreaming && !isUser && i === textParts.length - 1 ? (
                    <Text style={styles.caret}>▍</Text>
                  ) : null}
                </Text>
              ) : null;

            case 'dynamic-tool': {
              const p = part as unknown as Record<string, unknown>;
              const tp: ToolProgressPart = {
                toolName: part.toolName,
                state: part.state,
                output: p.output,
                errorText: p.errorText as string | undefined,
              };
              return <ToolProgress key={i} part={tp} />;
            }

            case 'data-thread':
              return null; // captured via `onData`, not rendered inline

            case 'data-yesno':
              return <YesNoButtons key={i} part={part.data} onReply={onReply} />;

            case 'data-questionnaire':
              return (
                <QuestionnaireForm key={i} part={part.data} onReply={onReply} />
              );

            case 'data-photo-request':
              return (
                <PhotoRequestButton key={i} part={part.data} onPress={onPhotoRequest} />
              );

            case 'reasoning': {
              const r = part as unknown as { text?: string };
              return r.text ? (
                <Text key={i} style={styles.reasoning}>{r.text}</Text>
              ) : null;
            }

            default:
              return null; // step-start, source, file, … not used in the draft
          }
        })}
      </View>
    </View>
  );
}

function Thinking() {
  return (
    <View style={styles.thinking}>
      <Text style={styles.thinkingText}>Thinking…</Text>
    </View>
  );
}

/** Yes/No buttons. Disables itself after the user answers once per part id. */
function YesNoButtons({
  part,
  onReply,
}: {
  part: { id: string; prompt: string };
  onReply: (text: string) => void;
}) {
  const [answered, setAnswered] = useState(false);
  const answer = (choice: string) => {
    if (answered) return;
    setAnswered(true);
    onReply(choice);
  };
  return (
    <View style={styles.interactive}>
      <Text style={styles.interactivePrompt}>{part.prompt}</Text>
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

/** Mini questionnaire: one selection per question, sent back as one message. */
function QuestionnaireForm({
  part,
  onReply,
}: {
  part: AgentQuestionnairePartData;
  onReply: (text: string) => void;
}) {
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
    <View style={styles.interactive}>
      {part.title ? <Text style={styles.interactivePrompt}>{part.title}</Text> : null}
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

function PhotoRequestButton({
  part,
  onPress,
}: {
  part: AgentPhotoRequestPartData;
  onPress: (part: AgentPhotoRequestPartData) => void;
}) {
  return (
    <View style={styles.interactive}>
      <Text style={styles.interactivePrompt}>{part.prompt}</Text>
      <Button title="📷 Take another photo" variant="secondary" fullWidth onPress={() => onPress(part)} />
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: theme.spacing.xs },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
  },
  bubbleUser: { backgroundColor: theme.colors.leaf, alignSelf: 'flex-end' },
  bubbleAssistant: { backgroundColor: theme.colors.creamSurface, alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.colors.border },
  userText: { ...theme.typography.body, color: theme.colors.creamSurface },
  assistantText: { ...theme.typography.body, color: theme.colors.text },
  caret: { color: theme.colors.leaf, fontWeight: '700' },
  reasoning: { ...theme.typography.caption, fontStyle: 'italic', color: theme.colors.textMuted },
  thinking: { paddingVertical: theme.spacing.xs },
  thinkingText: { ...theme.typography.body, color: theme.colors.textMuted, fontStyle: 'italic' },
  interactive: { gap: theme.spacing.sm },
  interactivePrompt: { ...theme.typography.body, color: theme.colors.text, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 },
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
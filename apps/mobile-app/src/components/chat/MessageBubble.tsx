import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AgentPhotoRequestPartData } from '@plant-doctor/api-types';
import { theme } from '@/constants/theme';
import {
  MessagePhotoRequest,
  MessageQuestionnaire,
  MessageReasoning,
  MessageText,
  MessageToolProgress,
  MessageYesNo,
  Thinking,
} from './message-parts';
import type { AgentUIMessage } from './agent-chat-types';

interface MessageBubbleProps {
  message: AgentUIMessage;
  /** True while this is the bottom message and a run is in flight (the synthetic
   * pending bubble, or the live message while its batch is being read). Drives
   * the "Thinking…" placeholder only — there is no token streaming. */
  isPending: boolean;
  /** Send the user's reply as their next message (used by yes/no + questionnaire). */
  onReply: (text: string) => void;
  /** The user tapped a "take another photo" request — host opens the picker. */
  onPhotoRequest: (part: AgentPhotoRequestPartData) => void;
}

/**
 * Renders one chat message by switching on `message.parts` and delegating each
 * part to a dedicated {@link ./message-parts} component:
 *  - `text`               → {@link MessageText} (markdown for assistant, plain for user)
 *  - `dynamic-tool`       → {@link MessageToolProgress} (tool/reasoning progress card)
 *  - `data-yesno`         → {@link MessageYesNo}
 *  - `data-questionnaire` → {@link MessageQuestionnaire}
 *  - `data-photo-request` → {@link MessagePhotoRequest}
 *  - `reasoning`          → {@link MessageReasoning}
 *  - `data-thread`        → not rendered (captured upstream via `useChat`'s `onData`)
 *
 * User messages are right-aligned (leaf); assistant messages left-aligned
 * (cream). The interactive parts only appear on assistant messages.
 */
function MessageBubbleImpl({ message, isPending, onReply, onPhotoRequest }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  // The loader shows while the pending message has no *visible* content yet.
  // The AI SDK creates the assistant message as soon as the stream opens with
  // invisible parts (`step-start`, and `data-thread` which is captured upstream
  // via `onData`), so requiring `parts.length === 0` hid the loader during the
  // long wait under `streaming` and left an empty bubble. Only parts that
  // render something count as content.
  const hasVisibleContent = message.parts.some((p) =>
    p.type === 'text'
      ? p.text.length > 0
      : p.type === 'dynamic-tool' ||
        p.type === 'reasoning' ||
        p.type === 'data-yesno' ||
        p.type === 'data-questionnaire' ||
        p.type === 'data-photo-request',
  );
  const showThinking = isPending && !isUser && !hasVisibleContent;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {showThinking ? <Thinking /> : null}
        {message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return <MessageText key={i} text={part.text} isUser={isUser} />;

            case 'dynamic-tool':
              return <MessageToolProgress key={i} part={part} />;

            case 'data-thread':
              return null; // captured via `onData`, not rendered inline

            case 'data-yesno':
              return <MessageYesNo key={i} part={part.data} onReply={onReply} />;

            case 'data-questionnaire':
              return <MessageQuestionnaire key={i} part={part.data} onReply={onReply} />;

            case 'data-photo-request':
              return <MessagePhotoRequest key={i} part={part.data} onPress={onPhotoRequest} />;

            case 'reasoning':
              return <MessageReasoning key={i} part={part} />;

            default:
              return null; // step-start, source, file, … not used
          }
        })}
      </View>
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
  bubbleAssistant: {
    backgroundColor: theme.colors.creamSurface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
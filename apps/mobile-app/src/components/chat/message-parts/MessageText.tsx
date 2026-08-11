import { StyleSheet, Text } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { theme } from '@/constants/theme';
import { markdownStyles } from '../markdownStyles';

interface MessageTextProps {
  text: string;
  /** Assistant text renders markdown; user text is plain (users don't type markdown). */
  isUser: boolean;
}

/** One `text` part of a message. Assistant text is rendered as themed markdown;
 * user text is plain. Empty strings render nothing. */
export function MessageText({ text, isUser }: MessageTextProps) {
  if (!text) return null;
  if (isUser) return <Text style={styles.userText}>{text}</Text>;
  return <Markdown style={markdownStyles}>{text}</Markdown>;
}

const styles = StyleSheet.create({
  userText: { ...theme.typography.body, color: theme.colors.creamSurface },
});
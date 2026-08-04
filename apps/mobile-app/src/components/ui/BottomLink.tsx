import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/constants/theme';

interface BottomLinkProps {
  /** Full label text, e.g. "Back to Monstera". */
  label: string;
  onPress: () => void;
  /** Optional glyph prefix shown before the label. Defaults to a left arrow. */
  prefix?: string;
}

/**
 * A pressable link pinned at the bottom of a scrollable screen. Used for
 * "go back to …" affordances. Kept deliberately simple so it can be redesigned
 * independently of the screens that use it.
 */
export function BottomLink({ label, onPress, prefix = '← ' }: BottomLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.dimmed]}
    >
      <Text style={styles.text}>{prefix}{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { paddingTop: theme.spacing.xl },
  text: { ...theme.typography.subtitle, color: theme.colors.leaf },
  dimmed: { opacity: 0.6 },
});
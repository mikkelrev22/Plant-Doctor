import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native';
import { Button } from './Button';
import { theme } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Centered empty/error state with an optional CTA. */
export function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  title: { ...theme.typography.subtitle, color: theme.colors.text, textAlign: 'center' },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
});
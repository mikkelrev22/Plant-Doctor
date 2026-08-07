import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native';
import { theme } from '@/constants/theme';

interface SpinnerProps {
  label?: string;
  size?: 'small' | 'large';
}

/** Centered spinner with an optional caption. */
export function Spinner({ label, size = 'large' }: SpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.leaf} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
  label: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
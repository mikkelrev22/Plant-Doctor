import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Flat (no gradient, no glass) button. `loading` swaps the label for a spinner.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isGhost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        (pressed || disabled) && styles.dimmed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={isGhost ? theme.colors.leaf : theme.colors.creamSurface}
          />
        ) : (
          <Text style={[styles.label, styles[`${variant}Label`]]}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch', alignItems: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.5 },
  label: { ...theme.typography.subtitle, letterSpacing: 0.2 },
  primary: { backgroundColor: theme.colors.leaf },
  secondary: {
    backgroundColor: theme.colors.creamSurface,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
  },
  danger: { backgroundColor: theme.colors.coral },
  ghost: { backgroundColor: 'transparent' },
  primaryLabel: { color: theme.colors.creamSurface },
  secondaryLabel: { color: theme.colors.leaf },
  dangerLabel: { color: theme.colors.creamSurface },
  ghostLabel: { color: theme.colors.leaf },
} as const);
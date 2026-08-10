import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Surface container: white fill, subtle border, low shadow (no iOS vibrancy). */
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.creamSurface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    // boxShadow (cross-platform: parsed by RN on native, native CSS on web)
    // replaces the deprecated iOS-only shadow* props. Equivalent to the prior
    // shadowColor #000 / shadowOpacity 0.04 / shadowRadius 6 / offset 0,1.
    boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.04)',
    elevation: 1,
  },
});
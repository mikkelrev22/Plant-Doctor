import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { MaxContentWidth, theme } from '@/constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Apply the top safe-area inset. Defaults to false because the Stack header
   * already consumes the status-bar area; enabling it there double-counts the
   * inset and leaves a gap above the content on iOS. Set true only for
   * headerless screens whose content sits under the status bar.
   */
  topInset?: boolean;
  /**
   * Styles merged onto the inner content column. Pass `paddingHorizontal: 0`
   * for full-bleed scroll areas so the scrollbar sits at the screen edge and
   * the page pads its scroll content instead.
   */
  bodyStyle?: StyleProp<ViewStyle>;
}

/**
 * Full-screen safe-area wrapper with the cream background and a centered,
 * max-width content column. Use as the root of every screen.
 */
export function Screen({ children, style, topInset = false, bodyStyle }: ScreenProps) {
  const edges: Edge[] = topInset
    ? ['top', 'left', 'right', 'bottom']
    : ['left', 'right', 'bottom'];
  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      <View style={[styles.body, bodyStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
});
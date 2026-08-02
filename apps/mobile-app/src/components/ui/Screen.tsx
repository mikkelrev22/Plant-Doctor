import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaxContentWidth, theme } from '@/constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-screen safe-area wrapper with the cream background and a centered,
 * max-width content column. Use as the root of every screen.
 */
export function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <View style={styles.body}>{children}</View>
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
  },
});
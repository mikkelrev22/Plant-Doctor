import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

const DOT_COUNT = 3;
const CYCLE_MS = 1200;

/** Animated typing-dots loader shown while the assistant run is in flight but
 * no content has arrived yet (the synthetic pending bubble, or the live
 * assistant message while its batch is being read). A single looping driver
 * value staggers each dot's opacity via offset interpolation ranges. */
export function Thinking() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: CYCLE_MS, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={styles.thinking}>
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        const start = i / DOT_COUNT;
        const peak = start + 1 / (DOT_COUNT * 2);
        const end = start + 1 / DOT_COUNT;
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: progress.interpolate({
                  inputRange: [start, peak, end, 1],
                  outputRange: [0.3, 1, 0.3, 0.3],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [start, peak, end],
                      outputRange: [0, -3, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.textMuted,
  },
});
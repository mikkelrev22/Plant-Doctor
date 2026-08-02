import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/constants/theme';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

interface LightboxProps {
  /** Absolute image URL to display full-screen. */
  url: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen image lightbox with native pinch-to-zoom + pan (iOS) and
 * double-tap to toggle zoom. Closes via the backdrop or the ✕ button.
 */
export function Lightbox({ url, visible, onClose }: LightboxProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  // Reset transform whenever the lightbox is dismissed.
  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        reset();
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const boundX = ((scale.value - 1) * width) / 2;
      const boundY = ((scale.value - 1) * height) / 2;
      translateX.value = clamp(savedX.value + e.translationX, -boundX, boundX);
      translateY.value = clamp(savedY.value + e.translationY, -boundY, boundY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      if (scale.value <= 1) reset();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const singleTap = Gesture.Tap()
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (scale.value <= 1) runOnJS(onClose)();
    });

  const gestures = Gesture.Race(
    Gesture.Simultaneous(pinch, pan),
    singleTap,
    doubleTap,
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <GestureDetector gesture={gestures}>
          <Animated.View style={[styles.imageWrap, { width, height }, animatedStyle]}>
            <Image
              source={{ uri: url }}
              style={styles.image}
              contentFit="contain"
              transition={150}
            />
          </Animated.View>
        </GestureDetector>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeButton, { top: insets.top + 8 }]}
          accessibilityLabel="Close"
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CLOSE_SIZE = 32;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: palette.creamSurface,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: CLOSE_SIZE,
    marginTop: -1,
  },
});
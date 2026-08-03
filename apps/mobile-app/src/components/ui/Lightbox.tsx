import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
/** Vertical drag (px) past which a swipe releases into a dismiss. */
const DISMISS_THRESHOLD = 120;
/** A fast fling dismisses even if the drag hasn't crossed the threshold. */
const DISMISS_FLING_VELOCITY = 800;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

interface LightboxProps {
  /** Absolute image URL to display full-screen. */
  url: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen image lightbox with native pinch-to-zoom + pan (iOS) and
 * double-tap to toggle zoom. At rest, a vertical swipe drags the image away
 * and releases into a dismiss (past a threshold or on a fling); otherwise it
 * springs back. Also closes via a backdrop tap or the ✕ button.
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
  // Scrim opacity dips as the image is swiped away, then restores on snap-back.
  const backdropOpacity = useSharedValue(1);
  // True while a pinch is active. The pan gesture checks this so a two-finger
  // pinch doesn't also trigger the swipe-to-dismiss path (which could close the
  // lightbox mid-pinch and crash).
  const pinching = useSharedValue(false);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    backdropOpacity.value = withTiming(1);
  };

  // Reset transform whenever the lightbox is dismissed.
  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      pinching.value = true;
    })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onFinalize(() => {
      pinching.value = false;
      if (scale.value < 1.05) {
        reset();
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // A pinch is in progress — let the pinch own the gesture; don't also
      // drag/fade the image (would otherwise dismiss mid-pinch and crash).
      if (pinching.value) return;
      if (scale.value > 1) {
        // Zoomed in: pan within the overscan bounds.
        const boundX = ((scale.value - 1) * width) / 2;
        const boundY = ((scale.value - 1) * height) / 2;
        translateX.value = clamp(savedX.value + e.translationX, -boundX, boundX);
        translateY.value = clamp(savedY.value + e.translationY, -boundY, boundY);
      } else {
        // At rest: the image follows the finger and the scrim fades — a
        // swipe-away. Horizontal drift rides along but only vertical travel
        // counts toward the dismiss threshold.
        translateX.value = e.translationX;
        translateY.value = e.translationY;
        backdropOpacity.value = 1 - Math.min(Math.abs(e.translationY) / 300, 1) * 0.6;
      }
    })
    .onEnd((e) => {
      if (pinching.value) return;
      if (scale.value > 1) {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      } else if (
        Math.abs(translateY.value) > DISMISS_THRESHOLD ||
        Math.abs(e.velocityY) > DISMISS_FLING_VELOCITY
      ) {
        runOnJS(onClose)();
      } else {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        backdropOpacity.value = withTiming(1);
      }
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

  const scrimStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.scrim, scrimStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
      </View>
    </Modal>
  );
}

const CLOSE_SIZE = 32;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
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
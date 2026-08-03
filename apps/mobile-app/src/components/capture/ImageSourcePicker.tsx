import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/constants/theme';

export interface SelectedImage {
  uri: string;
  mimeType: string;
}

/**
 * Longest edge we keep when normalizing a picked/captured photo. Plant
 * diagnosis only needs this much detail, and capping it keeps the upload well
 * under the backend's multipart limit while the backend further downsamples to
 * a 1024px display variant for the LLM.
 */
const MAX_LONG_EDGE = 1600;

/**
 * Re-encode a picked/captured image as a JPEG, downsampling the long edge when
 * it exceeds {@link MAX_LONG_EDGE}. The aspect ratio is preserved (we resize
 * only one axis).
 *
 * This matters because the gallery picker runs with `allowsEditing: false`, so
 * it returns the camera original — full-resolution, and on iOS often HEIC. The
 * backend's `sharp` can't always decode HEIC and the original can exceed its
 * 10 MB upload limit, both of which surface as a generic 500 `ApiError`.
 * Forcing a downscaled JPEG here keeps any aspect ratio (no forced crop) while
 * guaranteeing a payload the backend can handle.
 */
async function normalizeToJpeg(
  uri: string,
  width: number | undefined,
  height: number | undefined,
): Promise<SelectedImage> {
  const context = ImageManipulator.manipulate(uri);
  try {
    if (width && height) {
      const isLandscape = width >= height;
      if (isLandscape ? width > MAX_LONG_EDGE : height > MAX_LONG_EDGE) {
        context.resize(isLandscape ? { width: MAX_LONG_EDGE } : { height: MAX_LONG_EDGE });
      }
    }
    const rendered = await context.renderAsync();
    try {
      const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      return { uri: saved.uri, mimeType: 'image/jpeg' };
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}

interface ImageSourcePickerProps {
  onImageSelected: (image: SelectedImage) => void;
}

/**
 * `CameraView.zoom` is a 0..1 fraction of the device's maximum zoom, where `0`
 * is the widest field of view. On multi-camera phones that widest FoV is the
 * ultrawide lens — too wide for a plant close-up — so we start slightly cropped
 * in, and let the user pinch to fine-tune.
 */
const MIN_ZOOM = 0;
const MAX_ZOOM = 1;
const DEFAULT_ZOOM = 0.15;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type Mode = 'choose' | 'camera';

/**
 * Shared capture UI for the Add-plant and New-report flows.
 *
 * - Gallery: `expo-image-picker.launchImageLibraryAsync` (works on every platform).
 * - Camera: `expo-camera` live `CameraView` viewfinder. **expo-camera does not
 *   work on web**, so the "Take a photo" button is hidden on web (web uses the
 *   gallery picker, which on web opens a native file input).
 */
export function ImageSourcePicker({ onImageSelected }: ImageSourcePickerProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const zoomAtPinchStart = useRef(DEFAULT_ZOOM);

  // Pinch-to-zoom runs on the JS thread (`.runOnJS(true)`) and updates
  // `CameraView.zoom` as plain React state. Driving the native zoom prop via
  // Reanimated `useAnimatedProps` instead crashes Expo Go — `CameraView`
  // doesn't support `setNativeProps`, which animated props rely on.
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      zoomAtPinchStart.current = zoom;
    })
    .onUpdate((e) => {
      setZoom(clamp(zoomAtPinchStart.current * e.scale, MIN_ZOOM, MAX_ZOOM));
    });

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setProcessing(true);
    try {
      const normalized = await normalizeToJpeg(asset.uri, asset.width, asset.height);
      onImageSelected(normalized);
    } finally {
      setProcessing(false);
    }
  };

  const startCamera = async () => {
    if (permission?.status !== 'granted') {
      const res = await requestPermission();
      if (res.status !== 'granted') {
        setMode('choose');
        return;
      }
    }
    setMode('camera');
  };

  const takePhoto = async () => {
    setCapturing(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (picture) {
        const normalized = await normalizeToJpeg(picture.uri, picture.width, picture.height);
        onImageSelected(normalized);
      }
    } finally {
      setCapturing(false);
    }
  };

  if (mode === 'camera' && Platform.OS !== 'web') {
    if (permission?.status !== 'granted') {
      return (
        <View style={styles.container}>
          <EmptyState
            title="Camera access needed"
            subtitle="Grant camera permission in Settings to take a photo."
            actionLabel="Back"
            onAction={() => setMode('choose')}
          />
        </View>
      );
    }
    return (
      <View style={styles.cameraWrap}>
        <GestureDetector gesture={pinch}>
          <CameraView
            ref={cameraRef}
            facing="back"
            zoom={zoom}
            style={styles.camera}
          />
        </GestureDetector>
        <View pointerEvents="none" style={styles.zoomHintWrap}>
          <Text style={styles.zoomHint}>Pinch to zoom</Text>
        </View>
        <View style={styles.cameraControls}>
          <Button title="Back" variant="ghost" onPress={() => setMode('choose')} />
          <Pressable onPress={takePhoto} disabled={capturing} style={styles.shutter}>
            {capturing ? (
              <ActivityIndicator color={theme.colors.creamSurface} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <View style={styles.shutterSpacer} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Choose a photo of your plant to get a diagnosis.
      </Text>
      <Button title="Pick from gallery" variant="primary" fullWidth onPress={pickFromGallery} loading={processing} />
      {Platform.OS !== 'web' ? (
        <Button title="Take a photo" variant="secondary" fullWidth onPress={startCamera} loading={capturing} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  instruction: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  cameraWrap: { flex: 1, borderRadius: theme.radii.lg, overflow: 'hidden' },
  camera: { flex: 1 },
  zoomHintWrap: {
    position: 'absolute',
    top: theme.spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomHint: {
    ...theme.typography.caption,
    color: theme.colors.creamSurface,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: theme.colors.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.leaf },
  shutterSpacer: { width: 72 },
});
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/constants/theme';

export interface SelectedImage {
  uri: string;
  mimeType: string;
}

interface ImageSourcePickerProps {
  onImageSelected: (image: SelectedImage) => void;
}

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
  const cameraRef = useRef<CameraView>(null);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    onImageSelected({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
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
        const mimeType = picture.format === 'png' ? 'image/png' : 'image/jpeg';
        onImageSelected({ uri: picture.uri, mimeType });
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
        <CameraView ref={cameraRef} facing="back" style={styles.camera} />
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
      <Button title="Pick from gallery" variant="primary" fullWidth onPress={pickFromGallery} />
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
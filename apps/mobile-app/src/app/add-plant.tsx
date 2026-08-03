import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  ImageSourcePicker,
  type SelectedImage,
} from '@/components/capture/ImageSourcePicker';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { setAnalyzingContext } from '@/state/analyzing-holder';
import { useRequireAuth } from '@/hooks/use-require-auth';

/**
 * Add-plant flow: capture/pick an image, then hand it to the analyzing splash.
 * No plantId is sent, so the backend creates a new plant from this report.
 */
export default function AddPlantScreen() {
  const user = useRequireAuth();
  if (!user) return null;

  const onImageSelected = ({ uri, mimeType, capturedAt }: SelectedImage) => {
    // No plantId → the server creates the plant automatically.
    setAnalyzingContext({ imageUri: uri, mimeType, capturedAt });
    router.replace('/analyzing');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Show us the plant!</Text>
      </View>
      <ImageSourcePicker onImageSelected={onImageSelected} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: 4 },
  title: { ...theme.typography.title, color: theme.colors.leafDark },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted },
});
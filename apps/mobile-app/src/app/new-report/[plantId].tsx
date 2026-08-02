import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  ImageSourcePicker,
  type SelectedImage,
} from '@/components/capture/ImageSourcePicker';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { usePlant } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { setAnalyzingContext } from '@/state/analyzing-holder';

/**
 * New-report flow for an existing plant. Same capture UI as Add-plant, but the
 * plantId from the route is sent with the image so the report attaches to the
 * existing plant.
 */
export default function NewReportScreen() {
  const user = useRequireAuth();
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const id = Number(plantId);
  const { data: plant } = usePlant(id);

  if (!user) return null;

  const onImageSelected = ({ uri, mimeType }: SelectedImage) => {
    setAnalyzingContext({ imageUri: uri, mimeType, plantId: id });
    router.replace('/analyzing');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>New report</Text>
        <Text style={styles.subtitle}>
          {plant ? `for ${plant.name}` : 'Take or pick a photo to diagnose your plant.'}
        </Text>
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
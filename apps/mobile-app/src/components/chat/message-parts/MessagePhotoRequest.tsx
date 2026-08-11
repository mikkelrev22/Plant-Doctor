import { StyleSheet, Text, View } from 'react-native';
import type { AgentPhotoRequestPartData } from '@plant-doctor/api-types';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

interface MessagePhotoRequestProps {
  part: AgentPhotoRequestPartData;
  /** The user tapped the request — host opens the photo picker. */
  onPress: (part: AgentPhotoRequestPartData) => void;
}

/** `data-photo-request` part — the agent asks for another photo. A single
 * button that hands the request back to the host (which opens the picker). */
export function MessagePhotoRequest({ part, onPress }: MessagePhotoRequestProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.prompt}>{part.prompt}</Text>
      <Button title="📷 Take another photo" variant="secondary" fullWidth onPress={() => onPress(part)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.spacing.sm },
  prompt: { ...theme.typography.body, color: theme.colors.text, fontWeight: '600' },
});
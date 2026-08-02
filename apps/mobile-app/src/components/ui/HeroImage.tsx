import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

interface HeroImageProps {
  /** Absolute image URL from the backend, or null for the placeholder. */
  url: string | null;
  height?: number;
}

/** Full-width cover image with a floral placeholder when there's no photo yet. */
export function HeroImage({ url, height = 240 }: HeroImageProps) {
  if (!url) {
    return <View style={[styles.placeholder, { height }]} />;
  }
  return (
    <Image
      source={{ uri: url }}
      style={[styles.image, { height }]}
      contentFit="cover"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.border,
  },
  placeholder: {
    width: '100%',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.leafSoft,
    opacity: 0.5,
  },
});
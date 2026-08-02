import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Lightbox } from '@/components/ui/Lightbox';
import { theme } from '@/constants/theme';

interface HeroImageProps {
  /** Absolute image URL from the backend, or null for the placeholder. */
  url: string | null;
  height?: number;
}

/** Full-width cover image with a floral placeholder when there's no photo yet. */
export function HeroImage({ url, height = 240 }: HeroImageProps) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return <View style={[styles.placeholder, { height }]} />;
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.container,
          { height },
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={{ uri: url }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      </Pressable>
      <Lightbox url={url} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  placeholder: {
    width: '100%',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.leafSoft,
    opacity: 0.5,
  },
});
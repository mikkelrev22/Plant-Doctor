import { Image } from 'expo-image';
import type { PlantListItemDto } from '@plant-doctor/api-types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface PlantListItemProps {
  plant: PlantListItemDto;
  onPress: () => void;
}

/** A plant row: latest-report thumbnail, name, report count, chevron. */
export function PlantListItem({ plant, onPress }: PlantListItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.row}>
        {plant.thumbnailUrl ? (
          <Image
            source={{ uri: plant.thumbnailUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {plant.name}
          </Text>
          {plant.species ? (
            <Text style={styles.species} numberOfLines={1}>
              {plant.species}
            </Text>
          ) : null}
          <Text style={styles.caption}>
            {plant.reportCount === 1 ? '1 report' : `${plant.reportCount} reports`}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const THUMB = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.border,
  },
  thumbPlaceholder: { backgroundColor: theme.colors.leafSoft, opacity: 0.5 },
  meta: { flex: 1, gap: 2 },
  name: { ...theme.typography.subtitle, color: theme.colors.text },
  species: { ...theme.typography.caption, fontStyle: 'italic', color: theme.colors.textMuted },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
  chevron: { fontSize: 26, color: theme.colors.textMuted, lineHeight: 28 },
  pressed: { opacity: 0.6 },
});
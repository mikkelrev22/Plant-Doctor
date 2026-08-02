import { Image } from 'expo-image';
import type { PlantReportSummaryDto } from '@plant-doctor/api-types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface ReportListItemProps {
  report: PlantReportSummaryDto;
  onPress: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A report row: thumbnail, identified name, date, confidence pill. */
export function ReportListItem({ report, onPress }: ReportListItemProps) {
  const confidence =
    report.identificationConfidence != null
      ? Math.round(report.identificationConfidence)
      : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.row}>
        {report.photo?.thumbnailUrl ? (
          <Image
            source={{ uri: report.photo.thumbnailUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {report.identifiedPlantName ?? 'Unidentified'}
          </Text>
          <Text style={styles.caption}>{formatDate(report.reportedAt)}</Text>
        </View>
        {confidence != null ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{confidence}%</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const THUMB = 56;

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
  name: { ...theme.typography.body, color: theme.colors.text },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
  pill: {
    backgroundColor: theme.colors.leafSoft,
    borderRadius: theme.radii.pill,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  pillText: { ...theme.typography.caption, color: theme.colors.leafDark, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
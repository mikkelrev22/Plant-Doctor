import { router } from 'expo-router';
import { Image } from 'expo-image';
import type { PlantReportExtendedDto } from '@plant-doctor/api-types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { formatDate } from '@/utils/format-date';

interface ChatReportHeaderProps {
  /** The report currently in the chat's context. `undefined` while it loads. */
  report?: PlantReportExtendedDto;
}

/**
 * Sticky strip above the chat message list showing the plant/report the
 * conversation is about: the report's photo, the plant name, the identified
 * species, and the report date. Tapping it opens the full report
 * (`/report/[id]`) so the user can read the diagnosis behind the chat.
 *
 * Renders a fixed-height placeholder while `report` is undefined so the layout
 * doesn't shift when the report resolves. Follows the `ReportListItem` /
 * `PlantListItem` row pattern (thumbnail + meta column + chevron).
 */
export function ChatReportHeader({ report }: ChatReportHeaderProps) {
  if (!report) {
    return <View style={styles.row} />;
  }

  const species = report.scientificName?.trim();
  const meta = species ? `${species} · ${formatDate(report.reportedAt)}` : formatDate(report.reportedAt);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/report/[id]', params: { id: String(report.id) } })
      }
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={styles.row}>
        {report.photo?.thumbnailUrl || report.photo?.imageUrl ? (
          <Image
            source={{ uri: report.photo.thumbnailUrl ?? report.photo.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {report.plantName}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const THUMB = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: THUMB + theme.spacing.sm * 2,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.creamSurface,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.border,
  },
  thumbPlaceholder: { backgroundColor: theme.colors.leafSoft, opacity: 0.5 },
  meta: { flex: 1, gap: 1 },
  name: { ...theme.typography.subtitle, color: theme.colors.leafDark },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
  chevron: { ...theme.typography.subtitle, color: theme.colors.textMuted, fontWeight: '400' },
  pressed: { opacity: 0.6 },
});
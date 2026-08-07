import type {
  StressSeverity,
  StressSignStatus,
} from '@plant-doctor/api-types';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';
import { stressSignColor } from '@/utils/stress-sign-color';

/** Compact sign shape accepted by the dots — matches both the plants-list
 *  `PlantListItemStressSignDto` and the reports-list `ReportStressSignDto`. */
export interface StressDotSign {
  stressSignId: string;
  name: string;
  status: StressSignStatus;
  severity: StressSeverity;
}

interface StressDotsProps {
  signs: StressDotSign[];
  /** Circle diameter in px. Defaults to 8. */
  size?: number;
  /** When true (default), render a single green dot when no signs are present
   *  — the "healthy" indicator. Set false to render nothing in that case, e.g.
   *  for a plant with no reports yet, where "no signs" means "not diagnosed"
   *  rather than "everything is ok". */
  showHealthyDot?: boolean;
}

/**
 * A horizontal row of small colored circles, one per *present* stress sign —
 * the at-a-glance health indicator reused by `PlantListItem` (latest report)
 * and `ReportListItem` (this report). Absent/unknown signs are filtered out.
 *
 * When there are no present signs (the report found nothing wrong), a single
 * green dot is shown — unless `showHealthyDot` is false, in which case nothing
 * renders (used for plants that have no reports to diagnose).
 *
 * There are 16 seeded stress-sign types, so a row holds at most 16 dots and
 * wraps within the list item's `meta` column on narrow screens.
 */
export function StressDots({ signs, size = 8, showHealthyDot = true }: StressDotsProps) {
  const present = signs.filter((s) => s.status === 'present');

  if (present.length === 0) {
    if (!showHealthyDot) return null;
    return (
      <View
        style={styles.row}
        accessibilityRole="image"
        accessibilityLabel="No stress signs — healthy"
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.success,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={styles.row}
      accessibilityRole="summary"
      accessibilityLabel={`${present.length} stress sign${present.length === 1 ? '' : 's'}`}
    >
      {present.map((sign) => (
        <View
          key={sign.stressSignId}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: stressSignColor(sign),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
});
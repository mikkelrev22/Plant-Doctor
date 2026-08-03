import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface ChipProps {
  label: string;
}

/** Small rounded tag — used for likely stressors and status badges. */
export function Chip({ label }: ChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.pink,
    borderRadius: theme.radii.pill,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  label: { ...theme.typography.caption, color: theme.colors.leafDark, fontWeight: '600' },
});
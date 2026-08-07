import { Platform, Pressable, Text, type TextStyle } from 'react-native';
import { palette, theme } from '@/constants/theme';

interface HeaderButtonProps {
  /** Button label. */
  label: string;
  onPress?: () => void;
  /** Override the tint color (defaults to the navbar tint). */
  color?: string;
  /** Extra styles merged onto the label. */
  style?: TextStyle;
}

// On web the plain-text navbar button has no affordance, so wrap it in an
// iOS-style bordered pill. On native it stays plain text (the real iOS look).
const isWeb = Platform.OS === 'web';

const webWrap = {
  borderRadius: theme.radii.pill,
  paddingVertical: 10,
  backgroundColor: "white",
  paddingHorizontal: 12,
  marginHorizontal: 15,
  boxShadow: "0 0 15px 10px rgba(0,0,0,0.04)",
};

/**
 * Plain-text navbar action button — matches the Stack header's back button
 * (tint color, no bordered box) so it never gets clipped by the header height.
 * On web it renders as an iOS-style bordered pill for click affordance.
 */
export function HeaderButton({ label, onPress, color = palette.text, style }: HeaderButtonProps) {
  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [isWeb && webWrap, pressed && { opacity: 0.5 }]}
    >
      <Text
        style={[
          {
            color,
            paddingHorizontal: isWeb ? 0 : 5,
            fontSize: 17,
            fontWeight: '600',
          },
          style,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
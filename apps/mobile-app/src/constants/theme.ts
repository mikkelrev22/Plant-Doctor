/**
 * Light-mode-only floral design tokens for the Plant-Doctor prototype.
 *
 * No dark theme, no gradients. One small palette of bright floral tones;
 * components consume `theme` via StyleSheet. Kept as plain data (no React)
 * so it's trivially unit-testable and tree-shakeable.
 */

import { Platform } from 'react-native';

/** Core palette — bright floral tones, light mode only. */
export const palette = {
  /** Primary leaf green. */
  leaf: '#3B7A3A',
  leafDark: '#2F5F2E',
  leafSoft: '#8FBF7E',

  /** Floral accents. */
  coral: '#E8776A',
  pink: '#F2A7B5',

  /** Surfaces. */
  cream: '#F7F3EC',
  creamSurface: '#FFFFFF',

  /** Text. */
  text: '#2B2B2B',
  textMuted: '#6B6B6B',

  /** Lines & feedback. */
  border: '#E5E0D6',
  danger: '#C04848',
  success: '#3B7A3A',
} as const;

export type PaletteColor = keyof typeof palette;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  subtitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

/** Per-platform system font families (used sparingly; defaults are fine). */
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif' },
  default: { sans: 'normal', serif: 'serif' },
  web: {
    sans: 'Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
  },
});

/** Max content width for the single-column phone layout. */
export const MaxContentWidth = 640;

export const theme = {
  colors: palette,
  spacing: Spacing,
  radii: Radii,
  typography: Typography,
} as const;
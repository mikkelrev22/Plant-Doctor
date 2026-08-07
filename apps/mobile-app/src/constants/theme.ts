/**
 * Light-mode-only floral design tokens for the Plant-Doctor prototype.
 *
 * No dark theme, no gradients. One small palette of bright floral tones;
 * components consume `theme` via StyleSheet. Kept as plain data (no React)
 * so it's trivially unit-testable and tree-shakeable.
 */

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

  /** Stress-severity accents (used by the list-item stress-sign dots). */
  warning: '#E8C547', // mild
  alert: '#E8853A', // moderate
} as const;

const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

const Typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  subtitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

/** Max content width for the single-column phone layout. */
export const MaxContentWidth = 640;

export const theme = {
  colors: palette,
  spacing: Spacing,
  radii: Radii,
  typography: Typography,
} as const;
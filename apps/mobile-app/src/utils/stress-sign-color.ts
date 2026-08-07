import type { CompactStressSignDto } from '@plant-doctor/api-types';
import { theme } from '@/constants/theme';

/**
 * Maps a stress sign's status + severity to a theme color token.
 *
 *   absent   -> success (leaf green — healthy, sign not present)
 *   unknown  -> textMuted (gray — not evaluated)
 *   present  -> severe=danger, moderate=alert, mild=warning,
 *               none=warning (a present sign with no severity is treated as
 *               the mildest visible tier rather than rendered as healthy)
 *
 * Accepts the compact sign shape (`Pick<CompactStressSignDto, 'status' |
 * 'severity'>`), so it works for both list payloads that satisfy it.
 *
 * Pure data (no React) so it's trivially unit-testable.
 */
export function stressSignColor(
  sign: Pick<CompactStressSignDto, 'status' | 'severity'>,
): string {
  switch (sign.status) {
    case 'absent':
      return theme.colors.success;
    case 'unknown':
      return theme.colors.textMuted;
    case 'present':
      switch (sign.severity) {
        case 'severe':
          return theme.colors.danger;
        case 'moderate':
          return theme.colors.alert;
        case 'mild':
        case 'none':
          return theme.colors.warning;
      }
  }
}
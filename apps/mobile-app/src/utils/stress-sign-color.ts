import type {
  StressSeverity,
  StressSignStatus,
} from '@plant-doctor/api-types';
import { theme } from '@/constants/theme';

/**
 * The shape both list payloads share: the compact `PlantListItemStressSignDto`
 * (plants list) and the full `ReportStressSignDto` (reports list) both satisfy
 * this, so the helper works for either without a union type.
 */
export interface StressSignColorInput {
  status: StressSignStatus;
  severity: StressSeverity;
}

/**
 * Maps a stress sign's status + severity to a theme color token.
 *
 *   absent   -> success (leaf green — healthy, sign not present)
 *   unknown  -> textMuted (gray — not evaluated)
 *   present  -> severe=danger, moderate=alert, mild=warning,
 *               none=warning (a present sign with no severity is treated as
 *               the mildest visible tier rather than rendered as healthy)
 *
 * Pure data (no React) so it's trivially unit-testable.
 */
export function stressSignColor(sign: StressSignColorInput): string {
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
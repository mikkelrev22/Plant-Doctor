import { describe, expect, it } from 'vitest';

import { theme } from '@/constants/theme';
import { stressSignColor } from './stress-sign-color';

describe('stressSignColor', () => {
  it('maps absent to the success (green) token', () => {
    expect(stressSignColor({ status: 'absent', severity: 'none' })).toBe(
      theme.colors.success,
    );
  });

  it('maps unknown to the muted (gray) token', () => {
    expect(stressSignColor({ status: 'unknown', severity: 'none' })).toBe(
      theme.colors.textMuted,
    );
  });

  it('maps present severities to the traffic-light accents', () => {
    expect(stressSignColor({ status: 'present', severity: 'severe' })).toBe(
      theme.colors.danger,
    );
    expect(stressSignColor({ status: 'present', severity: 'moderate' })).toBe(
      theme.colors.alert,
    );
    expect(stressSignColor({ status: 'present', severity: 'mild' })).toBe(
      theme.colors.warning,
    );
  });

  it('treats a present sign with no severity as the mildest visible tier', () => {
    expect(stressSignColor({ status: 'present', severity: 'none' })).toBe(
      theme.colors.warning,
    );
  });
});
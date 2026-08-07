import type { StressSeverity, StressSignStatus } from '@plant-doctor/api-types';

export function severityColor(severity: StressSeverity) {
  switch (severity) {
    case 'severe':
      return 'red';
    case 'moderate':
      return 'orange';
    case 'mild':
      return 'yellow';
    default:
      return 'gray';
  }
}

export function statusLabel(status: StressSignStatus) {
  switch (status) {
    case 'present':
      return 'Present';
    case 'absent':
      return 'Absent';
    default:
      return 'Unknown';
  }
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

// Latency in seconds with one decimal, e.g. 3540ms → "3.5s". Returns '—' for null.
export function formatLatency(ms: number | null) {
  if (ms === null) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

// Shorten a Fireworks model id for display, e.g.
// "accounts/fireworks/models/qwen-vl-plus" → "fireworks/qwen-vl-plus".
// Unknown prefixes are left untouched. Used by the Eval title and history table.
export function formatModelName(model: string) {
  return model.replace('accounts/fireworks/models/', 'fireworks/');
}

// Temperature with up to 2 decimals, trimmed (0.20 → "0.2", 0.05 → "0.05").
// Returns '—' for null.
export function formatTemperature(value: number | null): string {
  if (value === null) return '—';
  return String(Math.round(value * 100) / 100);
}

// Reasoning effort capitalized for display ("none" → "None"). Returns '—' for
// null.
export function formatReasoningEffort(value: string | null): string {
  if (value === null || value === '') return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

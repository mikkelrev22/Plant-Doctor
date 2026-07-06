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

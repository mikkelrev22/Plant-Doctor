import { Badge, Tooltip } from '@mantine/core';
import type {
  ReportStressSignDto,
  StressSeverity,
} from '@plant-doctor/api-types';
import { severityColor, statusLabel } from '../utils/formatters';

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function presentBadgeLabel(severity: StressSeverity) {
  return severity === 'none' ? 'Present' : capitalize(severity);
}

function presentBadgeColor(severity: StressSeverity) {
  return severity === 'none' ? 'red' : severityColor(severity);
}

function stressTooltipLabel(sign: ReportStressSignDto) {
  const parts = [statusLabel(sign.status)];
  if (sign.confidence !== null) {
    parts.push(`${sign.confidence}%`);
  }
  if (sign.notes) {
    parts.push(sign.notes);
  }
  return parts.join(' · ');
}

export function StressSignBadge({ sign }: { sign: ReportStressSignDto }) {
  const label = stressTooltipLabel(sign);
  const badge =
    sign.status === 'present' ? (
      <Badge
        color={presentBadgeColor(sign.severity)}
        variant="filled"
        size="xs"
        radius="sm"
      >
        {presentBadgeLabel(sign.severity)}
      </Badge>
    ) : (
      <span>-</span>
    );

  return (
    <Tooltip label={label} multiline w={240} position="top" withArrow>
      {badge}
    </Tooltip>
  );
}
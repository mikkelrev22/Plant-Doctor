import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import type { ReportStressSignDto } from '@plant-doctor/api-types';
import { severityColor, statusLabel } from '../utils/formatters';
import styles from '../app.module.css';

interface StressSignCardProps {
  sign: ReportStressSignDto;
}

export function StressSignCard({ sign }: StressSignCardProps) {
  const isPresent = sign.status === 'present';

  return (
    <Card
      className={`${styles.stressCard} ${
        isPresent ? styles.stressCardPresent : ''
      }`}
      radius="md"
      padding="md"
    >
      <Stack gap={8}>
        <Group justify="space-between" align="flex-start" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <span
              className={`${styles.statusDot} ${
                isPresent ? styles.statusDotPresent : ''
              }`}
            />
            <Text fw={700} size="sm">
              {sign.name}
            </Text>
          </Group>
          <Badge color={severityColor(sign.severity)} variant="light">
            {sign.severity}
          </Badge>
        </Group>
        <Text c="dimmed" size="xs">
          {statusLabel(sign.status)}
          {sign.confidence !== null ? ` - ${sign.confidence}%` : ''}
          {sign.variables.length
            ? ` - ${sign.variables.map((variable) => variable.name).join(', ')}`
            : ''}
        </Text>
        <Text size="sm">
          {sign.notes || 'No specific image evidence noted.'}
        </Text>
      </Stack>
    </Card>
  );
}

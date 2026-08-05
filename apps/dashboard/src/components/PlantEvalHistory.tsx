import { Card, Group, Image, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconPlant } from '@tabler/icons-react';
import type { PlantListItemEvalDto } from '@plant-doctor/api-types';
import {
  formatDate,
  formatModelName,
  formatReasoningEffort,
  formatTemperature,
} from '../utils/formatters';
import { computeOverallScore, consistencyColor } from '../utils/eval-scoring';
import { usePlantReportsEval } from '../queries';
import { RowLink } from './RowLink';
import styles from '../app.module.css';

interface PlantEvalHistoryProps {
  plants: PlantListItemEvalDto[];
}

export function PlantEvalHistory({ plants }: PlantEvalHistoryProps) {
  // Eval tables live on plants that have reports. Newest first so the most
  // recent eval run is at the top — the full-screen eval layout has no sidebar.
  const withReports = plants
    .filter((p) => p.reportCount > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (withReports.length === 0) {
    return (
      <Card className={styles.panel} radius="lg" padding="lg">
        <Text c="dimmed">No plants with reports yet. Run an evaluation above.</Text>
      </Card>
    );
  }

  return (
    <Card className={styles.panel} radius="lg" padding="lg">
      <Stack gap="sm">
        <Table
          horizontalSpacing="sm"
          verticalSpacing="sm"
          highlightOnHover
          withTableBorder
          withColumnBorders
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Plant evaluation case</Table.Th>
              <Table.Th style={{ width: '11rem' }}>Model</Table.Th>
              <Table.Th style={{ width: '4rem' }}>Reports</Table.Th>
              <Table.Th style={{ width: '4.5rem' }}>Temp</Table.Th>
              <Table.Th style={{ width: '5rem' }}>Effort</Table.Th>
              <Table.Th style={{ width: '9rem' }}>Created</Table.Th>
              <Table.Th style={{ width: '5rem' }}>Score</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {withReports.map((p) => (
              <PlantEvalHistoryRow key={p.id} plant={p} />
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}

// One row per plant. Fetches that plant's eval reports on the fly to compute the
// overall consistency /100 score and read the latest run's temperature / reasoning
// effort (not persisted on the plant list endpoint). This is an N+1 fetch over
// the plant list — acceptable for the dashboard tool, which isn't optimized for
// scale.
function PlantEvalHistoryRow({ plant }: { plant: PlantListItemEvalDto }) {
  const reportsQuery = usePlantReportsEval(plant.id);
  const reports = reportsQuery.data ?? [];

  const latest = reports[0] ?? null;
  const temperature = latest?.llmRequest?.temperature ?? null;
  const reasoningEffort = latest?.llmRequest?.reasoningEffort ?? null;
  const score = reports.length > 0 ? computeOverallScore(reports) : null;
  const loading = reportsQuery.isLoading;

  return (
    <Table.Tr key={plant.id} className={styles.linkRow}>
      <Table.Td>
        <Group gap="sm" align="center">
          {plant.thumbnailUrl ? (
            <Image
              src={plant.thumbnailUrl}
              alt={plant.name}
              radius="sm"
              w={36}
              h={36}
              fit="cover"
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--mantine-radius-sm)',
                background: 'var(--mantine-color-gray-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconPlant size={18} color="var(--mantine-color-gray-5)" />
            </div>
          )}
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              <RowLink to={`/eval/${plant.id}`}>{plant.name}</RowLink>
            </Text>
            {plant.species && (
              <Text size="xs" c="dimmed">{plant.species}</Text>
            )}
          </Stack>
        </Group>
      </Table.Td>
      <Table.Td>
        {plant.models.length > 0 ? (
          <Tooltip
            label={plant.models.join(', ')}
            disabled={plant.models.length <= 1}
            position="top"
            withArrow
          >
            <Text size="xs" truncate style={{ maxWidth: '10rem' }}>
              {formatModelName(plant.models.join(', '))}
            </Text>
          </Tooltip>
        ) : (
          <Text size="xs" c="dimmed">—</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{plant.reportCount}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c={temperature === null ? 'dimmed' : undefined}>
          {loading ? '…' : formatTemperature(temperature)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c={reasoningEffort === null ? 'dimmed' : undefined}>
          {loading ? '…' : formatReasoningEffort(reasoningEffort)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{formatDate(plant.createdAt)}</Text>
      </Table.Td>
      <Table.Td>
        <Tooltip
          label="Overall consistency /100 across this plant's runs (identification · stressors · stress signs)"
          position="top"
          withArrow
        >
          <Text size="sm" fw={700} c={consistencyColor(score)}>
            {loading || score === null ? '—' : `${score}/100`}
          </Text>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
}
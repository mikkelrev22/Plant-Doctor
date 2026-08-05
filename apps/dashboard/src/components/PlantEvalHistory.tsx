import { Card, Group, Image, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconPlant } from '@tabler/icons-react';
import type { PlantListItemEvalDto } from '@plant-doctor/api-types';
import { formatDate, formatModelName } from '../utils/formatters';
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
              <Table.Th style={{ width: '5rem' }}>Reports</Table.Th>
              <Table.Th style={{ width: '9rem' }}>Created</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {withReports.map((p) => (
              <Table.Tr key={p.id} className={styles.linkRow}>
                <Table.Td>
                  <Group gap="sm" align="center">
                    {p.thumbnailUrl ? (
                      <Image
                        src={p.thumbnailUrl}
                        alt={p.name}
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
                        <RowLink to={`/eval/${p.id}`}>{p.name}</RowLink>
                      </Text>
                      {p.species && (
                        <Text size="xs" c="dimmed">{p.species}</Text>
                      )}
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {p.models.length > 0 ? (
                    <Tooltip
                      label={p.models.join(', ')}
                      disabled={p.models.length <= 1}
                      position="top"
                      withArrow
                    >
                      <Text size="xs" truncate style={{ maxWidth: '10rem' }}>
                        {formatModelName(p.models.join(', '))}
                      </Text>
                    </Tooltip>
                  ) : (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{p.reportCount}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">{formatDate(p.createdAt)}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}
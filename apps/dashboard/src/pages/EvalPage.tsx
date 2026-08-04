import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Group, Image, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { IconPlant } from '@tabler/icons-react';
import type { PlantListItemEvalDto } from '@plant-doctor/api-types';
import { useQueryClient } from '@tanstack/react-query';
import { analyzePlantReport } from '../api/api';
import { EvalControls } from '../components/EvalControls';
import { plantKeys } from '../queries';
import { usePlantsForEval } from '../queries';
import { formatDate } from '../utils/formatters';
import styles from '../app.module.css';

export function EvalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [images, setImages] = useState<File[]>([]);
  const [runs, setRuns] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const plantsQuery = usePlantsForEval();
  const plants = plantsQuery.data ?? [];

  async function runEval() {
    if (images.length === 0 || runs < 1) return;

    setRunning(true);
    setError(null);
    setProgress({ done: 0, total: runs });

    let plantId: number | undefined;
    const requestImages: File[] = [];
    for (let i = 0; i < runs; i++) {
      // Scenario 1 reuses the same image; Scenario 2 cycles through the set.
      requestImages.push(images[i % images.length]);
    }

    try {
      for (let i = 0; i < requestImages.length; i++) {
        try {
          const res = await analyzePlantReport({
            image: requestImages[i],
            plantId,
          });
          if (i === 0) {
            plantId = res.plant.id;
          }
        } catch (err) {
          // Record the failure but keep going so a single bad call doesn't
          // abort the whole eval run.
          setError(err instanceof Error ? err.message : String(err));
        }
        setProgress({ done: i + 1, total: runs });
      }

      // Refresh the plant list once so the new plant shows up in selectors.
      await queryClient.invalidateQueries({ queryKey: plantKeys.all });
      await queryClient.invalidateQueries({ queryKey: plantKeys.forEval });

      if (plantId !== undefined) {
        navigate(`/eval/${plantId}`);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <Stack gap="md">
      <Title order={2}>Evaluation</Title>

      <Card className={styles.panel} radius="lg" padding="lg">
        <EvalControls
          images={images}
          setImages={setImages}
          runs={runs}
          setRuns={setRuns}
          running={running}
          progress={progress}
          onRun={runEval}
        />
        {error && (
          <Alert color="red" title="Run error" mt="md">
            {error}
          </Alert>
        )}
      </Card>

      <PlantEvalHistory plants={plants} onOpen={(id) => navigate(`/eval/${id}`)} />
    </Stack>
  );
}

function PlantEvalHistory({
  plants,
  onOpen,
}: {
  plants: PlantListItemEvalDto[];
  onOpen: (plantId: number) => void;
}) {
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
              <Table.Tr
                key={p.id}
                onClick={() => onOpen(p.id)}
                style={{ cursor: 'pointer' }}
              >
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
                        <Text size="sm" fw={600}>{p.name}</Text>
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
                        {p.models.join(', ')
                          .replace('accounts/fireworks/models/', 'fireworks/')}
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
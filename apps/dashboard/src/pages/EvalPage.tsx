import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Stack, Title, Text, Button } from '@mantine/core';
import type { PlantListItemDto } from '@plant-doctor/api-types';
import { useQueryClient } from '@tanstack/react-query';
import { analyzePlantReport } from '../api/api';
import { EvalControls, type EvalScenario } from '../components/EvalControls';
import { plantKeys } from '../queries';
import { usePlants } from '../queries';
import styles from '../app.module.css';

export function EvalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scenario, setScenario] = useState<EvalScenario>('single');
  const [images, setImages] = useState<File[]>([]);
  const [runs, setRuns] = useState(3);
  const [plantName, setPlantName] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const plantsQuery = usePlants();
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
            // plantName only on the first call, which creates the plant.
            plantName: i === 0 ? plantName || undefined : undefined,
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
      <Text c="dimmed">
        Run <code>POST /reports/analyze</code> many times against one plant and
        compare consistency of the stress signs and per-run metrics. The first
        call creates the plant; the rest add reports to it. Results persist and
        can be reopened any time.
      </Text>

      <Card className={styles.panel} radius="lg" padding="lg">
        <EvalControls
          scenario={scenario}
          setScenario={(value) => {
            setScenario(value);
            // Switching to single after picking many keeps only the first.
            if (value === 'single') {
              setImages((prev) => prev.slice(0, 1));
            }
          }}
          images={images}
          setImages={(files) => {
            setImages(scenario === 'single' ? files.slice(0, 1) : files);
          }}
          runs={runs}
          setRuns={setRuns}
          plantName={plantName}
          setPlantName={setPlantName}
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
  plants: PlantListItemDto[];
  onOpen: (plantId: number) => void;
}) {
  // Eval tables live on plants that have reports. Show those first so they're
  // easy to reopen — the full-screen eval layout has no sidebar to browse from.
  const withReports = plants
    .filter((p) => p.reportCount > 0)
    .sort((a, b) => b.reportCount - a.reportCount);

  if (withReports.length === 0) {
    return (
      <Card className={styles.panel} radius="lg" padding="lg">
        <Text c="dimmed">No plants with reports yet. Run an evaluation above.</Text>
      </Card>
    );
  }

  return (
    <Card className={styles.panel} radius="lg" padding="lg">
      <Stack gap="xs">
        <Title order={4}>Past eval tables</Title>
        {withReports.map((p) => (
          <Button
            key={p.id}
            variant="subtle"
            justify="space-between"
            onClick={() => onOpen(p.id)}
          >
            <span>{p.name}</span>
            <Text size="xs" c="dimmed">
              {p.reportCount} report{p.reportCount === 1 ? '' : 's'}
            </Text>
          </Button>
        ))}
      </Stack>
    </Card>
  );
}
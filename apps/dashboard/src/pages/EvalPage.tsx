import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Group, Stack, Text, Title } from '@mantine/core';
import type { ReasoningEffort } from '@plant-doctor/api-types';
import { useQueryClient } from '@tanstack/react-query';
import { analyzePlantReport } from '../api/api';
import { EvalControls } from '../components/EvalControls';
import { PlantEvalHistory } from '../components/PlantEvalHistory';
import { plantKeys } from '../queries';
import { useLlmConfig } from '../queries';
import { usePlantsForEval } from '../queries';
import { formatModelName } from '../utils/formatters';
import styles from '../app.module.css';

export function EvalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [images, setImages] = useState<File[]>([]);
  const [runs, setRuns] = useState(10);
  const [temperature, setTemperature] = useState(0.05);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('none');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const plantsQuery = usePlantsForEval();
  const plants = plantsQuery.data ?? [];
  const llmConfig = useLlmConfig().data;

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
            temperature,
            reasoningEffort,
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
      <Group gap="sm" align="baseline" wrap="nowrap">
        <Title order={2}>Run new evaluation</Title>
        {llmConfig?.model ? (
          <Text size="sm" c="dimmed">{formatModelName(llmConfig.model)}</Text>
        ) : null}
      </Group>

      <Card className={styles.panel} radius="lg" padding="lg">
        <EvalControls
          images={images}
          setImages={setImages}
          runs={runs}
          setRuns={setRuns}
          temperature={temperature}
          setTemperature={setTemperature}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={setReasoningEffort}
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

      <PlantEvalHistory plants={plants} />
    </Stack>
  );
}
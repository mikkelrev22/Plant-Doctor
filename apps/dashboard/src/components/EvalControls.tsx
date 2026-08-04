import { Button, Group, NumberInput, Progress, Stack, Text, TextInput, SegmentedControl, rem } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';

export const ACCEPTED_IMAGE_TYPES = [
  ...IMAGE_MIME_TYPE,
  'image/heic',
  'image/heif',
];

export type EvalScenario = 'single' | 'multi';

interface EvalControlsProps {
  scenario: EvalScenario;
  setScenario: (value: EvalScenario) => void;
  images: File[];
  setImages: (files: File[]) => void;
  runs: number;
  setRuns: (value: number) => void;
  plantName: string;
  setPlantName: (value: string) => void;
  running: boolean;
  progress: { done: number; total: number };
  onRun: () => void;
  disabled?: boolean;
}

export function EvalControls({
  scenario,
  setScenario,
  images,
  setImages,
  runs,
  setRuns,
  plantName,
  setPlantName,
  running,
  progress,
  onRun,
  disabled,
}: EvalControlsProps) {
  const handleDrop = (files: File[]) => {
    setImages(scenario === 'single' ? files.slice(0, 1) : files);
  };

  const canRun = !running && !disabled && images.length > 0 && runs >= 1;
  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Stack gap="md">
      <SegmentedControl
        value={scenario}
        onChange={(value) => setScenario(value as EvalScenario)}
        data={[
          { label: 'One image, repeated', value: 'single' },
          { label: 'Multiple images', value: 'multi' },
        ]}
      />

      <Dropzone
        onDrop={handleDrop}
        onReject={(files) => console.log('rejected files', files)}
        maxSize={10 * 1024 ** 2}
        accept={ACCEPTED_IMAGE_TYPES}
        loading={running}
        radius="md"
        multiple={scenario === 'multi'}
      >
        <Group
          justify="center"
          gap="xl"
          mih={140}
          style={{ pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-blue-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              style={{ width: rem(42), height: rem(42), color: 'var(--mantine-color-dimmed)' }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="lg" inline>
              {scenario === 'single'
                ? 'Drop one plant image'
                : 'Drop multiple images of the same plant'}
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              {scenario === 'single'
                ? 'The same image is sent on every run.'
                : 'Different time, lighting, or angle. Images cycle across runs.'}
            </Text>
          </div>
        </Group>
      </Dropzone>

      {images.length > 0 && (
        <Text size="sm" c="teal">
          {images.length} image{images.length > 1 ? 's' : ''} selected:{' '}
          {images.map((f) => f.name).join(', ')}
        </Text>
      )}

      <Group grow align="flex-end">
        <NumberInput
          label="Number of runs"
          description="Consecutive /reports/analyze calls (20–50 is typical)."
          min={1}
          max={50}
          value={runs}
          onChange={(value) => setRuns(typeof value === 'number' ? value : 1)}
          disabled={running}
        />
        <TextInput
          label="Plant name (optional)"
          description="Used only on the first call, which creates the plant."
          placeholder="e.g. Eval Test"
          value={plantName}
          onChange={(e) => setPlantName(e.currentTarget.value)}
          disabled={running}
        />
      </Group>

      <Button onClick={onRun} disabled={!canRun} loading={running}>
        {running ? `Running ${progress.done}/${progress.total}…` : 'Run evaluation'}
      </Button>

      {running && (
        <Progress value={pct} size="sm" radius="xl" />
      )}

      {running && (
        <Text size="xs" c="dimmed">
          Calls run sequentially so latency measurements are clean.
        </Text>
      )}
    </Stack>
  );
}
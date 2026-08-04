import {
  Button,
  Group,
  Progress,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  rem,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';

export const ACCEPTED_IMAGE_TYPES = [
  ...IMAGE_MIME_TYPE,
  'image/heic',
  'image/heif',
];

interface EvalControlsProps {
  images: File[];
  setImages: (files: File[]) => void;
  runs: number;
  setRuns: (value: number) => void;
  running: boolean;
  progress: { done: number; total: number };
  onRun: () => void;
  disabled?: boolean;
}

const RUN_MARKS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 20, label: '20' },
  { value: 25, label: '25' }
];

export function EvalControls({
  images,
  setImages,
  runs,
  setRuns,
  running,
  progress,
  onRun,
  disabled,
}: EvalControlsProps) {
  // The scenario is inferred from how many images the user dropped: more than
  // one means "multi" (images cycle across runs); a single image is repeated.
  const isMulti = images.length > 1;

  const handleDrop = (files: File[]) => {
    setImages(files);
  };

  const canRun = !running && !disabled && images.length > 0 && runs >= 5;
  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {/* Left column: drop zone + selected-image preview. */}
      <Stack gap="md">
        <Dropzone
          onDrop={handleDrop}
          onReject={(files) => console.log('rejected files', files)}
          maxSize={10 * 1024 ** 2}
          accept={ACCEPTED_IMAGE_TYPES}
          loading={running}
          radius="md"
          multiple
        >
          <Group
            justify="center"
            gap="xl"
            mih={140}
            style={{ pointerEvents: 'none' }}
          >
            <Dropzone.Accept>
              <IconUpload
                style={{
                  width: rem(42),
                  height: rem(42),
                  color: 'var(--mantine-color-blue-6)',
                }}
                stroke={1.5}
              />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX
                style={{
                  width: rem(42),
                  height: rem(42),
                  color: 'var(--mantine-color-red-6)',
                }}
                stroke={1.5}
              />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconPhoto
                style={{
                  width: rem(42),
                  height: rem(42),
                  color: 'var(--mantine-color-dimmed)',
                }}
                stroke={1.5}
              />
            </Dropzone.Idle>

            <div>
              <Text size="lg" inline>
                {isMulti
                  ? 'Drop multiple images of the same plant'
                  : 'Drop one or more plant images'}
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                {isMulti
                  ? 'Different time, lighting, or angle. Images cycle across runs.'
                  : 'A single image is sent on every run; drop more to cycle.'}
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
      </Stack>

      {/* Right column: runs slider + Run button + progress. */}
      <Stack gap="md" justify="space-between">
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Number of runs: {runs}
            </Text>
          </Group>
          <Slider
            min={5}
            max={25}
            value={runs}
            onChange={setRuns}
            disabled={running}
            marks={RUN_MARKS}
          />
        </Stack>

        <Button onClick={onRun} disabled={!canRun} loading={running}>
          {running ? `Running ${progress.done}/${progress.total}…` : 'Run evaluation'}
        </Button>

        {running && <Progress value={pct} size="sm" radius="xl" />}
      </Stack>
    </SimpleGrid>
  );
}
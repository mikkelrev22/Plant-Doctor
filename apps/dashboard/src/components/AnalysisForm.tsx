import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Button, Card, Group, Text, rem } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import styles from '../app.module.css';

interface AnalysisFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setImage: (file: File | null) => void;
  image: File | null;
  loading: boolean;
  label?: string;
  children?: ReactNode;
}

const ACCEPTED_TYPES = [
  ...IMAGE_MIME_TYPE,
  'image/heic',
  'image/heif',
];

export function AnalysisForm({
  onSubmit,
  setImage,
  image,
  loading,
  label = 'Plant photo',
  children,
}: AnalysisFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [autoSubmit, setAutoSubmit] = useState(false);

  useEffect(() => {
    if (autoSubmit && image && !loading) {
      setAutoSubmit(false);
      formRef.current?.requestSubmit();
    }
  }, [image, autoSubmit, loading]);

  const handleDrop = (files: File[]) => {
    setImage(files[0]);
    setAutoSubmit(true);
  };

  return (
    <Card
      ref={formRef}
      className={styles.panel}
      component="form"
      onSubmit={onSubmit}
      radius="lg"
      padding="lg"
    >
      {children}
      <Dropzone
        onDrop={handleDrop}
        onReject={(files) => console.log('rejected files', files)}
        maxSize={10 * 1024 ** 2}
        accept={ACCEPTED_TYPES}
        loading={loading}
        radius="md"
      >
        <Group
          justify="center"
          gap="xl"
          mih={220}
          style={{ pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload
              style={{
                width: rem(52),
                height: rem(52),
                color: 'var(--mantine-color-blue-6)',
              }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{
                width: rem(52),
                height: rem(52),
                color: 'var(--mantine-color-red-6)',
              }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              style={{
                width: rem(52),
                height: rem(52),
                color: 'var(--mantine-color-dimmed)',
              }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              {label}
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Drag images here or click to select files
            </Text>
          </div>
        </Group>
      </Dropzone>

      {image && !loading && (
        <Text size="sm" mt="sm" c="teal">
          Selected file: {image.name}
        </Text>
      )}

      <Group justify="flex-end" mt="md">
        <Button color="teal" loading={loading} type="submit">
          Analyze plant
        </Button>
      </Group>
    </Card>
  );
}

import { FormEvent } from 'react';
import {
  Button,
  Card,
  FileInput,
  Group,
  Select,
  SimpleGrid,
  Text,
  TextInput,
} from '@mantine/core';
import type { PlantDto } from '@plant-doctor/api-types';
import styles from '../app.module.css';

interface AnalysisFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  plantOptions: { value: string; label: string }[];
  selectedPlantId: string | null;
  setSelectedPlantId: (id: string | null) => void;
  plantName: string;
  setPlantName: (name: string) => void;
  setImage: (file: File | null) => void;
  image: File | null;
  loading: boolean;
  selectedPlant: PlantDto | undefined;
}

export function AnalysisForm({
  onSubmit,
  plantOptions,
  selectedPlantId,
  setSelectedPlantId,
  plantName,
  setPlantName,
  setImage,
  image,
  loading,
  selectedPlant,
}: AnalysisFormProps) {
  return (
    <Card
      className={styles.panel}
      component="form"
      onSubmit={onSubmit}
      radius="lg"
      padding="lg"
    >
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Select
          clearable
          data={plantOptions}
          label="Existing plant"
          onChange={setSelectedPlantId}
          placeholder="Choose a plant"
          value={selectedPlantId}
        />
        <TextInput
          disabled={Boolean(selectedPlantId)}
          label="New plant name"
          onChange={(event) => setPlantName(event.currentTarget.value)}
          placeholder="Leave blank for a generated name"
          value={plantName}
        />
        <FileInput
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          clearable
          label="Plant photo"
          onChange={setImage}
          placeholder="Upload image"
          value={image}
        />
      </SimpleGrid>
      <Group justify="space-between" mt="md">
        <Text c="dimmed" size="sm">
          Current plant: {selectedPlant?.name ?? 'new plant'}
        </Text>
        <Button color="teal" loading={loading} type="submit">
          Analyze plant
        </Button>
      </Group>
    </Card>
  );
}

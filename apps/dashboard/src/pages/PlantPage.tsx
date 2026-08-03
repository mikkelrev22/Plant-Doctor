import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Loader, Stack, Text } from '@mantine/core';
import { AnalysisForm } from '../components/AnalysisForm';
import { PlantNameEditor } from '../components/PlantNameEditor';
import { PlantNotesEditor } from '../components/PlantNotesEditor';
import { ReportsTable } from '../components/ReportsTable';
import {
  useAnalyzeReport,
  usePlant,
} from '../queries';

export function PlantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = id ? Number(id) : null;

  const [image, setImage] = useState<File | null>(null);
  const [updateNameError, setUpdateNameError] = useState<string | null>(null);
  const [updateNotesError, setUpdateNotesError] = useState<string | null>(null);

  const plantQuery = usePlant(plantId);
  const analyzeMutation = useAnalyzeReport();

  const plant = plantQuery.data;

  const loading = analyzeMutation.isPending;
  const error =
    plantQuery.error?.message ??
    analyzeMutation.error?.message ??
    updateNameError ??
    updateNotesError ??
    null;

  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image || !plantId) return;

    analyzeMutation.mutate(
      { image, plantId },
      {
        onSuccess: (response) => {
          setImage(null);
          navigate(`/report/${response.report.id}`);
        },
      },
    );
  }

  if (plantQuery.isLoading) {
    return <Loader />;
  }

  if (!plant) {
    return <Text>Plant not found</Text>;
  }

  return (
    <Stack gap="lg">
      {error ? (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      ) : null}

      <PlantNameEditor
        plantId={plant.id}
        initialName={plant.name}
        species={plant.species}
        onMutationError={setUpdateNameError}
      />

      <PlantNotesEditor
        plantId={plant.id}
        initialNotes={plant.notes}
        onMutationError={setUpdateNotesError}
      />

      <AnalysisForm
        image={image}
        loading={loading}
        label={`Upload new photo of ${plant.name}`}
        onSubmit={handleSubmit}
        setImage={setImage}
      />

      <ReportsTable plantId={plant.id} />
    </Stack>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Title,
  Text,
} from '@mantine/core';
import { AnalysisForm } from '../components/AnalysisForm';
import { EvalResultsGrid } from '../components/EvalResultsGrid';
import { EvalResultsTable } from '../components/EvalResultsTable';
import { EvalStatsPanel } from '../components/EvalStatsPanel';
import { PlantNameEditor } from '../components/PlantNameEditor';
import { PlantNotesEditor } from '../components/PlantNotesEditor';
import {
  useAnalyzeReport,
  usePlant,
  usePlantReportsEval,
  usePlants,
} from '../queries';

export function EvalResultsPage() {
  const params = useParams<{ plantId: string }>();
  const plantId = params.plantId ? Number(params.plantId) : null;
  const navigate = useNavigate();

  const plantsQuery = usePlants();
  const plantQuery = usePlant(plantId);
  const reportsQuery = usePlantReportsEval(plantId);

  const plant = plantQuery.data ?? null;
  const analyzeMutation = useAnalyzeReport();

  const [image, setImage] = useState<File | null>(null);
  const [updateNameError, setUpdateNameError] = useState<string | null>(null);
  const [updateNotesError, setUpdateNotesError] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(
    plantId !== null ? String(plantId) : null,
  );
  const [view, setView] = useState<'table' | 'grid'>('table');

  const plantOptions = (plantsQuery.data ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.reportCount})`,
  }));

  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image || plantId === null) return;

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

  if (plantId === null) {
    return <Text c="dimmed">Invalid plant id.</Text>;
  }

  if (plantQuery.isLoading) {
    return <Loader />;
  }

  if (!plant) {
    return <Text>Plant not found</Text>;
  }

  const reports = reportsQuery.data ?? [];
  const error =
    reportsQuery.error?.message ??
    analyzeMutation.error?.message ??
    updateNameError ??
    updateNotesError ??
    null;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">

        <PlantNameEditor
          plantId={plant.id}
          initialName={plant.name}
          species={plant.species}
          onMutationError={setUpdateNameError}
        />

        <Group gap="sm">
          <Select
            placeholder="Switch plant"
            value={selectedPlant}
            onChange={(value) => {
              setSelectedPlant(value);
              if (value) navigate(`/eval/${value}`);
            }}
            data={plantOptions}
            w={220}
          />
          <Button variant="light" component={Link} to="/">
            New evaluation
          </Button>
        </Group>
      </Group>

      {error ? (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      ) : null}


      {reportsQuery.isLoading ? (
        <Loader />
      ) : reports.length === 0 ? (
        <Text c="dimmed">No reports for this plant yet.</Text>
      ) : (
        <>
          <EvalStatsPanel reports={reports} />
          <Group justify="space-between">
            <PlantNotesEditor
              plantId={plant.id}
              initialNotes={plant.notes}
              onMutationError={setUpdateNotesError}
            />

            <SegmentedControl
              size="md"
              value={view}
              onChange={(v) => setView(v as 'table' | 'grid')}
              data={[
                { value: 'table', label: 'Table' },
                { value: 'grid', label: 'Grid' },
              ]}
            />
          </Group>
          {view === 'table' ? (
            <EvalResultsTable reports={reports} />
          ) : (
            <EvalResultsGrid reports={reports} />
          )}
        </>
      )}

      <AnalysisForm
        image={image}
        loading={analyzeMutation.isPending}
        label={`Upload new photo of ${plant.name}`}
        onSubmit={handleSubmit}
        setImage={setImage}
      />
    </Stack>
  );
}
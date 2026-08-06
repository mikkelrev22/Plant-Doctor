import { useState } from 'react';
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
import { usePlantReportsEval, usePlants } from '../queries';
import { EvalResultsGrid } from '../components/EvalResultsGrid';
import { EvalResultsTable } from '../components/EvalResultsTable';
import { EvalStatsPanel } from '../components/EvalStatsPanel';

export function EvalResultsPage() {
  const params = useParams<{ plantId: string }>();
  const plantId = params.plantId ? Number(params.plantId) : null;
  const navigate = useNavigate();

  const plantsQuery = usePlants();
  const reportsQuery = usePlantReportsEval(plantId);

  const plantOptions = (plantsQuery.data ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.reportCount})`,
  }));

  const [selectedPlant, setSelectedPlant] = useState<string | null>(
    plantId !== null ? String(plantId) : null,
  );
  const [view, setView] = useState<'table' | 'grid'>('table');

  if (plantId === null) {
    return <Text c="dimmed">Invalid plant id.</Text>;
  }

  if (reportsQuery.isLoading) {
    return <Loader />;
  }

  if (reportsQuery.error) {
    return (
      <Alert color="red" title="Error">
        {reportsQuery.error.message}
      </Alert>
    );
  }

  const reports = reportsQuery.data ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Eval results</Title>
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
            searchable
          />
          <Button variant="light" component={Link} to="/eval">
            New evaluation
          </Button>
        </Group>
      </Group>

      {reports.length === 0 ? (
        <Text c="dimmed">No reports for this plant yet.</Text>
      ) : (
        <>
          <EvalStatsPanel reports={reports} />
          <Group justify="flex-end">
            <SegmentedControl
              size="xs"
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
    </Stack>
  );
}
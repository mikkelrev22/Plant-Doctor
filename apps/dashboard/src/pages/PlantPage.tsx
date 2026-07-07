import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import type { PlantReportSummaryDto } from '@plant-doctor/api-types';
import { AnalysisForm } from '../components/AnalysisForm';
import { formatDate } from '../utils/formatters';
import {
  useAnalyzeReport,
  usePlant,
  usePlantReports,
  useUpdatePlantName,
} from '../queries';

export function PlantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = id ? Number(id) : null;

  const [image, setImage] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const plantQuery = usePlant(plantId);
  const reportsQuery = usePlantReports(plantId);
  const analyzeMutation = useAnalyzeReport();
  const updateNameMutation = useUpdatePlantName();

  const plant = plantQuery.data;
  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const loading = analyzeMutation.isPending;
  const error =
    plantQuery.error?.message ??
    reportsQuery.error?.message ??
    analyzeMutation.error?.message ??
    updateNameMutation.error?.message ??
    null;

  useEffect(() => {
    if (plant) {
      setEditedName(plant.name);
    }
  }, [plant]);

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

  function handleSaveName() {
    if (!plantId || !editedName.trim()) return;
    updateNameMutation.mutate(
      { id: plantId, name: editedName.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
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

      {isEditing ? (
        <Group gap="xs">
          <TextInput
            value={editedName}
            onChange={(e) => setEditedName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            style={{ flex: 1 }}
          />
          <ActionIcon
            onClick={handleSaveName}
            loading={updateNameMutation.isPending}
            variant="light"
            color="green"
            size="lg"
          >
            <IconCheck size={20} />
          </ActionIcon>
          <ActionIcon
            onClick={() => {
              setIsEditing(false);
              setEditedName(plant.name);
            }}
            variant="light"
            color="red"
            size="lg"
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>
      ) : (
        <Group gap="xs" align="center">
          <Title order={2}>{plant.name}</Title>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setIsEditing(true)}
          >
            <IconEdit size={20} />
          </ActionIcon>
        </Group>
      )}

      <AnalysisForm
        image={image}
        loading={loading}
        label={`Upload new photo of ${plant.name}`}
        onSubmit={handleSubmit}
        setImage={setImage}
      />

      <Stack gap="md">
        <Title order={3}>Reports</Title>
        {reportsQuery.isLoading ? (
          <Loader />
        ) : reports.length ? (
          <Stack gap="xs">
            {reports.map((report: PlantReportSummaryDto) => (
              <Card
                key={report.id}
                onClick={() => navigate(`/report/${report.id}`)}
                padding="sm"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
              >
                <Text fw={700} size="sm">
                  {report.identifiedPlantName ?? report.plantName}
                </Text>
                <Text c="dimmed" size="xs">
                  {formatDate(report.reportedAt)}
                </Text>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed">No reports yet for this plant.</Text>
        )}
      </Stack>
    </Stack>
  );
}

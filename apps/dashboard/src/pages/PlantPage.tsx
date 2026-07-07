import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Card, Loader, Stack, Text, Title } from '@mantine/core';
import type { PlantReportSummaryDto } from '@plant-doctor/api-types';
import { AnalysisForm } from '../components/AnalysisForm';
import { formatDate } from '../utils/formatters';
import { useAnalyzeReport, usePlant, usePlantReports } from '../queries';

export function PlantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = id ? Number(id) : null;

  const [image, setImage] = useState<File | null>(null);

  const plantQuery = usePlant(plantId);
  const reportsQuery = usePlantReports(plantId);
  const analyzeMutation = useAnalyzeReport();

  const plant = plantQuery.data;
  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const loading = analyzeMutation.isPending;
  const error =
    plantQuery.error?.message ??
    reportsQuery.error?.message ??
    analyzeMutation.error?.message ??
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

      <Title order={2}>{plant.name}</Title>

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

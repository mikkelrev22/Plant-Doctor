import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  Divider,
  FileInput,
  Group,
  Image,
  Loader,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Route, Routes } from 'react-router-dom';
import type {
  AnalyzeReportResponse,
  PlantDto,
  PlantReportDetailDto,
  PlantReportSummaryDto,
  ReportStressSignDto,
  StressSeverity,
  StressSignStatus,
} from '@plant-doctor/api-types';
import {
  analyzePlantReport,
  getPlantReports,
  getPlants,
  getReport,
  getStressSigns,
} from './api';
import styles from './app.module.css';

type NavSection = 'home' | 'plants' | 'reports' | 'diagnostics';

function severityColor(severity: StressSeverity) {
  switch (severity) {
    case 'severe':
      return 'red';
    case 'moderate':
      return 'orange';
    case 'mild':
      return 'yellow';
    default:
      return 'gray';
  }
}

function statusLabel(status: StressSignStatus) {
  switch (status) {
    case 'present':
      return 'Present';
    case 'absent':
      return 'Absent';
    default:
      return 'Unknown';
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function StressSignCard({ sign }: { sign: ReportStressSignDto }) {
  const isPresent = sign.status === 'present';

  return (
    <Card
      className={`${styles.stressCard} ${
        isPresent ? styles.stressCardPresent : ''
      }`}
      radius="md"
      padding="md"
    >
      <Stack gap={8}>
        <Group justify="space-between" align="flex-start" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <span
              className={`${styles.statusDot} ${
                isPresent ? styles.statusDotPresent : ''
              }`}
            />
            <Text fw={700} size="sm">
              {sign.name}
            </Text>
          </Group>
          <Badge color={severityColor(sign.severity)} variant="light">
            {sign.severity}
          </Badge>
        </Group>
        <Text c="dimmed" size="xs">
          {statusLabel(sign.status)}
          {sign.confidence !== null ? ` - ${sign.confidence}%` : ''}
          {sign.variables.length
            ? ` - ${sign.variables.map((variable) => variable.name).join(', ')}`
            : ''}
        </Text>
        <Text size="sm">
          {sign.notes || 'No specific image evidence noted.'}
        </Text>
      </Stack>
    </Card>
  );
}

function ReportView({
  report,
  pendingImageUrl,
}: {
  report: PlantReportDetailDto | null;
  pendingImageUrl: string | null;
}) {
  const imageUrl = report?.photo?.imageUrl ?? pendingImageUrl;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card className={styles.panel} radius="lg" padding="lg">
          <Stack gap="sm">
            <div className={styles.photoFrame}>
              {imageUrl ? (
                <Image className={styles.photo} src={imageUrl} alt="Plant" />
              ) : (
                <div className={styles.emptyPhoto}>
                  Upload a plant image to generate the first report.
                </div>
              )}
            </div>
            <Text c="dimmed" size="sm">
              {report
                ? `${report.photo ? 1 : 0} photo(s) stored`
                : 'No report yet'}
            </Text>
          </Stack>
        </Card>

        <Card className={styles.panel} radius="lg" padding="lg">
          {report ? (
            <Stack gap="md">
              <Stack gap={4}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Identified Plant
                </Text>
                <Title c="teal.9" order={2}>
                  {report.identifiedPlantName ?? report.plantName}
                </Title>
                {report.scientificName ? (
                  <Text c="dimmed" fs="italic">
                    {report.scientificName}
                  </Text>
                ) : null}
                <Text c="dimmed" size="sm">
                  ID confidence:{' '}
                  {report.identificationConfidence !== null
                    ? `${report.identificationConfidence}%`
                    : 'unknown'}
                </Text>
              </Stack>
              <Stack gap={6}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Likely Stressors
                </Text>
                <Group gap="xs">
                  {report.likelyStressors.length ? (
                    report.likelyStressors.map((stressor) => (
                      <Badge color="teal" key={stressor} variant="light">
                        {stressor}
                      </Badge>
                    ))
                  ) : (
                    <Badge color="gray" variant="light">
                      none
                    </Badge>
                  )}
                </Group>
              </Stack>
              <Stack gap={6}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Summary
                </Text>
                <Text>{report.summary}</Text>
              </Stack>
              <Stack gap={6}>
                <Text c="dimmed" size="xs" tt="uppercase">
                  Recommendations
                </Text>
                <Text>{report.recommendations}</Text>
              </Stack>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Text c="dimmed" size="xs" tt="uppercase">
                Preview
              </Text>
              <Title order={2}>Plant health report</Title>
              <Text c="dimmed">
                Choose an existing plant or name a new one, upload a photo, and
                the model response will populate this report plus the database.
              </Text>
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <Card className={styles.panel} radius="lg" padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Stress sign checklist</Title>
            <Text c="dimmed" size="sm">
              {report
                ? `${report.stressSigns.length} signs evaluated`
                : 'waiting'}
            </Text>
          </Group>
          {report ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {report.stressSigns.map((sign) => (
                <StressSignCard key={sign.stressSignId} sign={sign} />
              ))}
            </SimpleGrid>
          ) : (
            <Text c="dimmed">
              The checklist will fill with model observations after analysis.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function DashboardHome() {
  const [plants, setPlants] = useState<PlantDto[]>([]);
  const [history, setHistory] = useState<PlantReportSummaryDto[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeReportResponse | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const plantOptions = useMemo(
    () =>
      plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
    [plants],
  );
  const selectedPlant = plants.find(
    (plant) => String(plant.id) === selectedPlantId,
  );

  async function refreshPlants() {
    setPlants(await getPlants());
  }

  async function refreshHistory(plantId: number) {
    setHistory(await getPlantReports(plantId));
  }

  useEffect(() => {
    Promise.all([refreshPlants(), getStressSigns()])
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load dashboard data',
        );
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!selectedPlantId) {
      setHistory([]);
      return;
    }

    refreshHistory(Number(selectedPlantId)).catch((caughtError: unknown) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to load report history',
      );
    });
  }, [selectedPlantId]);

  useEffect(() => {
    if (!image) {
      setPendingImageUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPendingImageUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!image) {
      setError('Choose a plant image first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await analyzePlantReport({
        image,
        plantId: selectedPlantId ? Number(selectedPlantId) : undefined,
        plantName: selectedPlantId ? undefined : plantName,
      });

      setResult(response);
      setSelectedPlantId(String(response.plant.id));
      setPlantName('');
      setImage(null);
      await refreshPlants();
      await refreshHistory(response.plant.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to analyze plant',
      );
    } finally {
      setLoading(false);
    }
  }

  async function openReport(reportId: number) {
    setLoading(true);
    setError(null);

    try {
      const report = await getReport(reportId);
      const plant = plants.find((item) => item.id === report.plantId);

      setResult({
        plant:
          plant ??
          ({
            id: report.plantId,
            name: report.plantName,
            notes: null,
            createdAt: report.reportedAt,
            updatedAt: report.reportedAt,
          } satisfies PlantDto),
        report,
      });
      setActiveSection('home');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to open report',
      );
    } finally {
      setLoading(false);
    }
  }

  const report = result?.report ?? null;

  return (
    <AppShell
      aside={{
        width: 320,
        breakpoint: 'md',
        collapsed: { mobile: true },
      }}
      className={styles.shell}
      padding={0}
    >
      <AppShell.Main className={styles.main}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text c="teal.8" fw={700} size="sm" tt="uppercase">
                Technical and research preview
              </Text>
              <Title order={1}>Plant Doctor Dashboard</Title>
              <Text c="dimmed">
                Upload a houseplant photo, log the model interaction, and save a
                longitudinal health report.
              </Text>
            </Stack>
            {booting || loading ? <Loader color="teal" /> : null}
          </Group>

          {error ? (
            <Alert color="red" title="Something needs attention">
              {error}
            </Alert>
          ) : null}

          <Card
            className={styles.panel}
            component="form"
            onSubmit={handleSubmit}
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

          <ReportView report={report} pendingImageUrl={pendingImageUrl} />
        </Stack>
      </AppShell.Main>

      <AppShell.Aside p="md">
        <ScrollArea h="100%">
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={3}>Navigation</Title>
              <Text c="dimmed" size="sm">
                Preview workspace controls and diagnostics.
              </Text>
            </Stack>
            <Stack gap="xs">
              {(
                [
                  ['home', 'Home'],
                  ['plants', 'Plants'],
                  ['reports', 'Recent Reports'],
                  ['diagnostics', 'LLM Diagnostics'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  className={styles.navButton}
                  color="teal"
                  key={value}
                  onClick={() => setActiveSection(value)}
                  variant={activeSection === value ? 'light' : 'subtle'}
                >
                  {label}
                </Button>
              ))}
            </Stack>

            <Divider />

            {activeSection === 'plants' ? (
              <Stack gap="xs">
                <Text fw={700}>Plants</Text>
                {plants.length ? (
                  plants.map((plant) => (
                    <Button
                      className={styles.navButton}
                      key={plant.id}
                      onClick={() => {
                        setSelectedPlantId(String(plant.id));
                        setActiveSection('reports');
                      }}
                      variant="subtle"
                    >
                      {plant.name}
                    </Button>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">
                    No plants saved yet.
                  </Text>
                )}
              </Stack>
            ) : null}

            {activeSection === 'reports' || activeSection === 'home' ? (
              <Stack gap="xs">
                <Text fw={700}>Recent Reports</Text>
                {history.length ? (
                  history.map((item) => (
                    <Card
                      key={item.id}
                      onClick={() => openReport(item.id)}
                      padding="sm"
                      radius="md"
                      withBorder
                    >
                      <Text fw={700} size="sm">
                        {item.identifiedPlantName ?? item.plantName}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {formatDate(item.reportedAt)}
                      </Text>
                    </Card>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">
                    Select a plant to see its report history.
                  </Text>
                )}
              </Stack>
            ) : null}

            {activeSection === 'diagnostics' ? (
              <Stack gap="xs">
                <Text fw={700}>LLM Diagnostics</Text>
                {report?.llmRequest ? (
                  <>
                    <Text size="sm">
                      Model: {report.llmRequest.model ?? 'unknown'}
                    </Text>
                    <Text size="sm">
                      Provider: {report.llmRequest.provider ?? 'unknown'}
                    </Text>
                    <Text size="sm">
                      Latency: {report.llmRequest.latencyMs ?? 'unknown'} ms
                    </Text>
                    <Text
                      c={report.llmRequest.error ? 'red' : 'teal'}
                      size="sm"
                    >
                      Status: {report.llmRequest.error ?? 'logged successfully'}
                    </Text>
                  </>
                ) : (
                  <Text c="dimmed" size="sm">
                    Run or open a report to view its LLM log summary.
                  </Text>
                )}
              </Stack>
            ) : null}
          </Stack>
        </ScrollArea>
      </AppShell.Aside>
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="*" element={<DashboardHome />} />
    </Routes>
  );
}

export default App;

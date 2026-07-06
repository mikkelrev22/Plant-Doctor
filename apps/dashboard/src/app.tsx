import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, AppShell, Stack } from '@mantine/core';
import { Route, Routes } from 'react-router-dom';
import type { AnalyzeReportResponse, PlantDto } from '@plant-doctor/api-types';
import styles from './app.module.css';
import { NavSection } from './types';
import { ReportView } from './components/ReportView';
import { Sidebar } from './components/Sidebar';
import { AnalysisForm } from './components/AnalysisForm';
import { DashboardHeader } from './components/DashboardHeader';
import {
  useAnalyzeReport,
  usePlantReports,
  usePlants,
  useReport,
  useStressSigns,
} from './queries';
import { useDisclosure } from '@mantine/hooks';

function DashboardHome() {
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeReportResponse | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [opened, { toggle }] = useDisclosure();

  const plantsQuery = usePlants();
  const stressSignsQuery = useStressSigns();
  const reportsQuery = usePlantReports(
    selectedPlantId ? Number(selectedPlantId) : null,
  );
  const reportQuery = useReport(selectedReportId);
  const analyzeMutation = useAnalyzeReport();

  const plants = useMemo(() => plantsQuery.data ?? [], [plantsQuery.data]);
  const history = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const booting = plantsQuery.isLoading || stressSignsQuery.isLoading;
  const loading = analyzeMutation.isPending || reportQuery.isLoading;

  const error =
    plantsQuery.error?.message ??
    stressSignsQuery.error?.message ??
    reportsQuery.error?.message ??
    reportQuery.error?.message ??
    analyzeMutation.error?.message ??
    null;

  const plantOptions = useMemo(
    () =>
      plants.map((plant) => ({ value: String(plant.id), label: plant.name })),
    [plants],
  );
  const selectedPlant = plants.find(
    (plant) => String(plant.id) === selectedPlantId,
  );

  useEffect(() => {
    const data = reportQuery.data;
    if (!data) return;

    const plant = plants.find((item) => item.id === data.plantId);
    setResult({
      plant:
        plant ??
        ({
          id: data.plantId,
          name: data.plantName,
          notes: null,
          createdAt: data.reportedAt,
          updatedAt: data.reportedAt,
        } satisfies PlantDto),
      report: data,
    });
    setActiveSection('home');
  }, [reportQuery.data, plants]);

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
      return;
    }

    setSelectedReportId(null);

    analyzeMutation.mutate(
      {
        image,
        plantId: selectedPlantId ? Number(selectedPlantId) : undefined,
        plantName: selectedPlantId ? undefined : plantName,
      },
      {
        onSuccess: (response) => {
          setResult(response);
          setSelectedPlantId(String(response.plant.id));
          setPlantName('');
          setImage(null);
        },
      },
    );
  }

  function openReport(reportId: number) {
    setResult(null);
    setSelectedReportId(reportId);
  }

  const report = result?.report ?? null;

  return (
    <AppShell
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      className={styles.shell}
      padding="lg"
      withBorder
    >
      <AppShell.Navbar p="md">
        <Sidebar
          activeSection={activeSection}
          history={history}
          openReport={openReport}
          plants={plants}
          report={report}
          setActiveSection={setActiveSection}
          setSelectedPlantId={setSelectedPlantId}
        />
      </AppShell.Navbar>
      <AppShell.Main className={styles.main}>
        <Stack gap="lg">
          <DashboardHeader booting={booting} loading={loading} />

          {error ? (
            <Alert color="red" title="Something needs attention">
              {error}
            </Alert>
          ) : null}

          <AnalysisForm
            image={image}
            loading={loading}
            onSubmit={handleSubmit}
            plantName={plantName}
            plantOptions={plantOptions}
            selectedPlant={selectedPlant}
            selectedPlantId={selectedPlantId}
            setImage={setImage}
            setPlantName={setPlantName}
            setSelectedPlantId={setSelectedPlantId}
          />

          <ReportView report={report} pendingImageUrl={pendingImageUrl} />
        </Stack>
      </AppShell.Main>
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

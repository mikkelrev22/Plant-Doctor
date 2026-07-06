import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, AppShell, Stack } from '@mantine/core';
import { Route, Routes } from 'react-router-dom';
import type {
  AnalyzeReportResponse,
  PlantDto,
  PlantReportSummaryDto,
} from '@plant-doctor/api-types';
import {
  analyzePlantReport,
  getPlantReports,
  getPlants,
  getReport,
  getStressSigns,
} from './api';
import styles from './app.module.css';
import { NavSection } from './types';
import { ReportView } from './components/ReportView';
import { Sidebar } from './components/Sidebar';
import { AnalysisForm } from './components/AnalysisForm';
import { DashboardHeader } from './components/DashboardHeader';

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

      <AppShell.Aside p="md">
        <Sidebar
          activeSection={activeSection}
          history={history}
          openReport={openReport}
          plants={plants}
          report={report}
          setActiveSection={setActiveSection}
          setSelectedPlantId={setSelectedPlantId}
        />
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

import {
  Button,
  Card,
  Divider,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type {
  PlantDto,
  PlantReportDetailDto,
  PlantReportSummaryDto,
} from '@plant-doctor/api-types';
import { formatDate } from '../utils/formatters';
import { NavSection } from '../types';
import styles from '../app.module.css';

interface SidebarProps {
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  plants: PlantDto[];
  setSelectedPlantId: (id: string) => void;
  history: PlantReportSummaryDto[];
  openReport: (reportId: number) => void;
  report: PlantReportDetailDto | null;
}

export function Sidebar({
  activeSection,
  setActiveSection,
  plants,
  setSelectedPlantId,
  history,
  openReport,
  report,
}: SidebarProps) {
  return (
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
                  style={{ cursor: 'pointer' }}
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
                <Text c={report.llmRequest.error ? 'red' : 'teal'} size="sm">
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
  );
}

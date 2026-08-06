import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type {
  LlmDetectedRegion,
  LlmPlantAnalysisResult,
  PlantReportEvalDto,
} from '@plant-doctor/api-types';
import { useLlmRequest } from '../queries';
import { RegionOverlayImage } from './RegionOverlayImage';
import styles from '../app.module.css';

interface EvalResultsGridProps {
  reports: PlantReportEvalDto[];
}

// Image-led alternative to EvalResultsTable: one card per run, the plant photo
// with the LLM's detected regions drawn over it as the main feature. Only the
// report id (bottom-left) and the count of present stress signs (bottom-right)
// are shown. Each card links to the report page, like column 1 of the table.
export function EvalResultsGrid({ reports }: EvalResultsGridProps) {
  if (reports.length === 0) {
    return (
      <Stack gap="md">
        <Title order={4}>Results</Title>
        <Text c="dimmed">No reports for this plant yet.</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Title order={4}>Results</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
        {reports.map((report) => (
          <EvalGridCard key={report.id} report={report} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// Separate component so each card can call useLlmRequest (hooks can't be
// called in a loop inside the parent). Deduped with other useLlmRequest calls
// for the same id by React Query key.
function EvalGridCard({ report }: { report: PlantReportEvalDto }) {
  const llmRequestQuery = useLlmRequest(report.llmRequest?.id ?? null);

  // Parse detectedRegions out of the raw LLM response string. Async — the
  // photo renders immediately, frames appear once this resolves. Mirrors the
  // logic in ReportPage.
  const detectedRegions = useMemo<LlmDetectedRegion[]>(() => {
    const response = llmRequestQuery.data?.response;
    if (!response) return [];
    try {
      const parsed = JSON.parse(response) as LlmPlantAnalysisResult;
      return Array.isArray(parsed.detectedRegions) ? parsed.detectedRegions : [];
    } catch {
      return [];
    }
  }, [llmRequestQuery.data?.response]);

  const signNames = useMemo(
    () => new Map(report.stressSigns.map((s) => [s.stressSignId, s.name])),
    [report.stressSigns],
  );

  const imageUrl = report.photo?.imageUrl ?? report.photo?.thumbnailUrl ?? null;
  const presentCount = report.stressSigns.filter((s) => s.status === 'present').length;

  // Pinned to the bottom corners of the image (rendered inside the overlay
  // layer by RegionOverlayImage). ID as plain text with a shadow for legibility
  // over any photo; present-sign count as a bare numeric badge (red when any
  // are present, gray when none).
  const bottomLeft = (
    <Text size="xs" fw={700} c="white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
      #{report.id}
    </Text>
  );
  const bottomRight = (
    <Badge color={presentCount > 0 ? 'red' : 'gray'} variant="filled" size="sm" radius="sm">
      {presentCount}
    </Badge>
  );

  return (
    <Card
      component={Link}
      to={`/report/${report.id}`}
      padding={0}
      radius={0}
      className={styles.panel}
      withBorder={false}
    >
      <div className={styles.photoFrame}>
        {imageUrl ? (
          <RegionOverlayImage
            imageUrl={imageUrl}
            regions={detectedRegions}
            signNames={signNames}
            alt={`Report #${report.id}`}
            bottomLeft={bottomLeft}
            bottomRight={bottomRight}
          />
        ) : (
          <div className={styles.emptyPhoto}>No photo</div>
        )}
      </div>
    </Card>
  );
}
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type { LlmDetectedRegion, PlantReportDetailDto } from '@plant-doctor/api-types';
import { RegionOverlayImage } from './RegionOverlayImage';
import { StressSignCard } from './StressSignCard';
import { toImgSrc } from '../utils/urls';
import styles from '../app.module.css';

interface ReportViewProps {
  report: PlantReportDetailDto | null;
  pendingImageUrl: string | null;
  // LLM-detected stress regions to draw over the photo. Parsed on the host
  // page from the llm-request detail response; empty/undefined = no overlay.
  detectedRegions?: LlmDetectedRegion[];
}

export function ReportView({ report, pendingImageUrl, detectedRegions }: ReportViewProps) {
  const imageUrl = toImgSrc(report?.photo?.imageUrl ?? pendingImageUrl);
  // stressSignId -> name for the region frame labels, from the report's
  // evaluated signs. Falls back to "Region N" inside the overlay for ids not
  // in this list.
  const signNames = report
    ? new Map(report.stressSigns.map((s) => [s.stressSignId, s.name]))
    : undefined;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card className={styles.panel} radius="lg" padding="lg">
          <Stack gap="sm">
            <div className={styles.photoFrame}>
              {imageUrl ? (
                <RegionOverlayImage
                  imageUrl={imageUrl}
                  regions={detectedRegions ?? []}
                  signNames={signNames}
                  alt="Plant"
                />
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

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Loader, Stack, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import type { LlmDetectedRegion, LlmPlantAnalysisResult } from '@plant-doctor/api-types';
import { LlmRequestLogTable } from '../components/LlmRequestLogTable';
import { ReportView } from '../components/ReportView';
import { useLlmRequest, useReport } from '../queries';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = id ? Number(id) : null;

  const reportQuery = useReport(reportId);
  const report = reportQuery.data ?? null;

  // Fetch the llm-request detail to get the raw LLM response, which contains
  // the detected stress regions. Deduped with LlmRequestLogTable's call by
  // React Query key. Async — the photo renders immediately, frames appear
  // once this resolves.
  const llmRequestQuery = useLlmRequest(report?.llmRequest?.id ?? null);
  const detectedRegions = useMemo<LlmDetectedRegion[]>(() => {
    const response = llmRequestQuery.data?.response;

    console.log('response', response);
    if (!response) return [];
    try {
      const parsed = JSON.parse(response) as LlmPlantAnalysisResult;
      return Array.isArray(parsed.detectedRegions) ? parsed.detectedRegions : [];
    } catch {
      return [];
    }

  }, [llmRequestQuery.data?.response]);

  if (reportQuery.isLoading) {
    return <Loader />;
  }

  if (reportQuery.error) {
    return (
      <Stack gap="lg">
        <Alert color="red" title="Error">
          {reportQuery.error.message}
        </Alert>
      </Stack>
    );
  }

  if (!report) {
    return <Text>Report not found</Text>;
  }

  return (
    <Stack gap="lg">
      <Button
        component={Link}
        to={`/plant/${report.plantId}`}
        variant="subtle"
        color="teal"
        leftSection={<IconArrowLeft size={16} />}
        justify="flex-start"
        w="fit-content"
      >
        Back to {report.plantName}
      </Button>

      <ReportView
        pendingImageUrl={null}
        report={report}
        detectedRegions={detectedRegions}
      />

      <LlmRequestLogTable
        llmRequestId={report.llmRequest?.id ?? null}
      />
    </Stack>
  );
}
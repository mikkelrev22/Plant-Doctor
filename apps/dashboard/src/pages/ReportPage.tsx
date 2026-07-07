import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Loader, Stack, Text } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { LlmRequestLogTable } from '../components/LlmRequestLogTable';
import { ReportView } from '../components/ReportView';
import { useReport } from '../queries';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = id ? Number(id) : null;

  const reportQuery = useReport(reportId);
  const report = reportQuery.data ?? null;

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

      <ReportView pendingImageUrl={null} report={report} />

      <LlmRequestLogTable
        llmRequestId={report.llmRequest?.id ?? null}
      />
    </Stack>
  );
}
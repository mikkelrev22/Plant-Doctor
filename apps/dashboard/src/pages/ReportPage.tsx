import { useParams } from 'react-router-dom';
import { Loader, Stack, Text } from '@mantine/core';
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

  if (!report) {
    return <Text>Report not found</Text>;
  }

  return (
    <Stack gap="lg">
      <ReportView pendingImageUrl={null} report={report} />
    </Stack>
  );
}

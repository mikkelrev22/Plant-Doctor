import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Image,
  Loader,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import type { PlantReportExtendedDto } from '@plant-doctor/api-types';
import { usePlantReportsExtended } from '../queries';
import { formatDate } from '../utils/formatters';
import { toImgSrc } from '../utils/urls';
import { StressSignBadge } from './StressSignBadge';
import styles from '../app.module.css';

interface ReportsTableProps {
  plantId: number;
}

export function ReportsTable({ plantId }: ReportsTableProps) {
  const reportsQuery = usePlantReportsExtended(plantId);

  const reports = useMemo(
    () => reportsQuery.data ?? [],
    [reportsQuery.data],
  );

  // Columns are the full stress-sign checklist in sortOrder. The service
  // returns every report's stress signs in sortOrder, so the first report gives
  // the canonical column set; every other report is matched by stressSignId.
  const columns = useMemo(() => {
    const first = reports[0]?.stressSigns ?? [];
    const seen = new Set<string>();
    return first.filter((sign) => {
      if (seen.has(sign.stressSignId)) return false;
      seen.add(sign.stressSignId);
      return true;
    });
  }, [reports]);

  if (reportsQuery.isLoading) {
    return <Loader />;
  }

  if (reportsQuery.error) {
    return (
      <Alert color="red" title="Error">
        {reportsQuery.error.message}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Title order={3}>Reports</Title>
      {reports.length ? (
        <ScrollArea scrollbars="x" type="scroll" offsetScrollbars>
          <Table
            horizontalSpacing="xs"
            verticalSpacing="xs"
            className={styles.reportsTable}
            striped="even"
            withTableBorder
            withColumnBorders
            layout="fixed"
            style={{ minWidth: '42rem' }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th className={styles.reportLabelHeader}>Report</Table.Th>
                {columns.map((sign) => (
                  <Table.Th
                    key={sign.stressSignId}
                    className={styles.signHeader}
                  >
                    {sign.name}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.map((report: PlantReportExtendedDto) => {
                const signById = new Map(
                  report.stressSigns.map((sign) => [sign.stressSignId, sign]),
                );
                return (
                  <Table.Tr key={report.id}>
                    <Table.Td className={styles.reportLabelCell}>
                      <Link to={`/report/${report.id}`}>
                        <Stack gap={4}>
                          <Text size="xs" fw={700} c="blue">
                            {formatDate(report.reportedAt)}
                          </Text>
                          {report.photo?.thumbnailUrl ? (
                            <Image
                              src={toImgSrc(report.photo.thumbnailUrl)}
                              alt={report.identifiedPlantName ?? report.plantName}
                              radius="sm"
                              w={48}
                              h={48}
                              fit="cover"
                            />
                          ) : null}
                        </Stack>
                      </Link>
                    </Table.Td>
                    {columns.map((column) => {
                      const sign = signById.get(column.stressSignId);
                      return (
                        <Table.Td
                          key={column.stressSignId}
                          className={styles.signCell}
                        >
                          {sign ? (
                            <StressSignBadge sign={sign} />
                          ) : (
                            <StressSignBadge
                              sign={{
                                stressSignId: column.stressSignId,
                                name: column.name,
                                status: 'unknown',
                                severity: 'none',
                                confidence: null,
                                notes: null,
                                variables: [],
                              }}
                            />
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      ) : (
        <Text c="dimmed">No reports yet for this plant.</Text>
      )}
    </Stack>
  );
}
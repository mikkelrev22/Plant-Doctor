import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ScrollArea, Table, Text, Title, Stack } from '@mantine/core';
import type { PlantReportEvalDto, ReportStressSignDto } from '@plant-doctor/api-types';
import { formatDate } from '../utils/formatters';
import { StressSignBadge } from './StressSignBadge';
import styles from '../app.module.css';

interface EvalResultsTableProps {
  reports: PlantReportEvalDto[];
}

// Canonical stress-sign columns in sortOrder from the first report's signs
// (same dedupe logic as ReportsTable). Every other report is matched by id.
function deriveColumns(reports: PlantReportEvalDto[]): ReportStressSignDto[] {
  const first = reports[0]?.stressSigns ?? [];
  const seen = new Set<string>();
  return first.filter((sign) => {
    if (seen.has(sign.stressSignId)) return false;
    seen.add(sign.stressSignId);
    return true;
  });
}

function tokensLabel(report: PlantReportEvalDto) {
  const total = report.llmRequest?.totalTokens ?? null;
  return total === null ? '—' : String(total);
}

function latencyLabel(report: PlantReportEvalDto) {
  const ms = report.llmRequest?.latencyMs ?? null;
  return ms === null ? '—' : `${ms}ms`;
}

export function EvalResultsTable({ reports }: EvalResultsTableProps) {
  const columns = useMemo(() => deriveColumns(reports), [reports]);

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
      <ScrollArea scrollbars="x" type="scroll" offsetScrollbars>
        <Table
          horizontalSpacing="xs"
          verticalSpacing="xs"
          className={styles.reportsTable}
          striped="even"
          withTableBorder
          withColumnBorders
          layout="fixed"
          style={{ minWidth: '52rem' }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th className={styles.reportLabelHeader}>#</Table.Th>
              <Table.Th className={styles.signHeader}>Report</Table.Th>
              <Table.Th className={styles.signHeader}>Time</Table.Th>
              <Table.Th className={styles.signHeader}>Latency</Table.Th>
              <Table.Th className={styles.signHeader}>Tokens</Table.Th>
              <Table.Th className={styles.signHeader}>Identified</Table.Th>
              <Table.Th className={styles.signHeader}>Stressors</Table.Th>
              {columns.map((sign) => (
                <Table.Th key={sign.stressSignId} className={styles.signHeader}>
                  {sign.name}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {reports.map((report, index) => {
              const signById = new Map(
                report.stressSigns.map((s) => [s.stressSignId, s]),
              );
              return (
                <Table.Tr key={report.id}>
                  <Table.Td className={styles.reportLabelCell}>{index + 1}</Table.Td>
                  <Table.Td className={styles.reportLabelCell}>
                    <Link to={`/report/${report.id}`}>
                      <Text size="xs" fw={700} c="blue">
                        #{report.id}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td className={styles.signCell}>
                    <Text size="xs">{formatDate(report.reportedAt)}</Text>
                  </Table.Td>
                  <Table.Td className={styles.signCell}>
                    <Text size="xs">{latencyLabel(report)}</Text>
                  </Table.Td>
                  <Table.Td className={styles.signCell}>
                    <Text size="xs">{tokensLabel(report)}</Text>
                  </Table.Td>
                  <Table.Td className={styles.signCell}>
                    <Text size="xs">{report.identifiedPlantName ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td className={styles.signCell}>
                    <Text size="xs">{report.likelyStressors.join(', ') || '—'}</Text>
                  </Table.Td>
                  {columns.map((column) => {
                    const sign = signById.get(column.stressSignId);
                    return (
                      <Table.Td key={column.stressSignId} className={styles.signCell}>
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
    </Stack>
  );
}
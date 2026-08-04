import {
  Badge,
  Card,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import type { PlantReportEvalDto, ReportStressSignDto } from '@plant-doctor/api-types';
import { computeRunCost, computeTotalCost, formatCost } from '../utils/llm-pricing';
import { formatLatency } from '../utils/formatters';

interface EvalStatsPanelProps {
  reports: PlantReportEvalDto[];
}

function stat(value: number | null) {
  return value === null ? '—' : String(value);
}

function avg(values: number[]) {
  return values.length === 0
    ? null
    : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function minMax(values: number[]) {
  if (values.length === 0) return [null, null] as const;
  return [Math.min(...values), Math.max(...values)] as const;
}

// For each stress-sign column, the most common status across runs and the % of
// runs matching it — the headline consistency metric. Considers only runs that
// evaluated the sign (had a stored row for it); signs evaluated on every run
// with the same verdict score 100%.
function signConsistency(reports: PlantReportEvalDto[]) {
  const columns = deriveColumns(reports);
  return columns.map((column) => {
    const counts = new Map<string, number>();
    let evaluated = 0;
    for (const report of reports) {
      const sign = report.stressSigns.find(
        (s) => s.stressSignId === column.stressSignId,
      );
      if (!sign) continue;
      evaluated++;
      const key = sign.status;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (evaluated === 0) {
      return { column, status: '—', pct: null, evaluated: 0 };
    }
    let bestStatus = '—';
    let bestCount = 0;
    for (const [status, count] of counts) {
      if (count > bestCount) {
        bestStatus = status;
        bestCount = count;
      }
    }
    return {
      column,
      status: bestStatus,
      pct: Math.round((bestCount / evaluated) * 100),
      evaluated,
    };
  });
}

// Same canonical-column derivation as EvalResultsTable / ReportsTable.
function deriveColumns(reports: PlantReportEvalDto[]): ReportStressSignDto[] {
  const first = reports[0]?.stressSigns ?? [];
  const seen = new Set<string>();
  return first.filter((sign) => {
    if (seen.has(sign.stressSignId)) return false;
    seen.add(sign.stressSignId);
    return true;
  });
}

function StatTile({ label, value, sub }: { label: string; value: string, sub: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Flex gap={5} align="flex-end">
        <Text size="lg" fw={700}>
          {value}
        </Text>
        <Text size="md">{sub}</Text>
      </Flex>
    </Stack>
  );
}

export function EvalStatsPanel({ reports }: EvalStatsPanelProps) {
  const latencies = reports
    .map((r) => r.llmRequest?.latencyMs ?? null)
    .filter((v): v is number => v !== null);
  const promptTokens = reports
    .map((r) => r.llmRequest?.promptTokens ?? null)
    .filter((v): v is number => v !== null);
  const completionTokens = reports
    .map((r) => r.llmRequest?.completionTokens ?? null)
    .filter((v): v is number => v !== null);
  const totalTokens = reports
    .map((r) => r.llmRequest?.totalTokens ?? null)
    .filter((v): v is number => v !== null);

  const [minLat, maxLat] = minMax(latencies);
  const avgLat = avg(latencies);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const consistency = signConsistency(reports);

  // Identification consistency: share of runs returning the same plant name as
  // the first run.
  const firstIdName = reports[0]?.identifiedPlantName ?? null;
  const idMatchCount = reports.filter(
    (r) => r.identifiedPlantName && r.identifiedPlantName === firstIdName,
  ).length;
  const idPct =
    reports.length > 0 ? Math.round((idMatchCount / reports.length) * 100) : null;

  const totalCost = computeTotalCost(reports);
  const costRuns = reports.filter((r) => computeRunCost(r.llmRequest) !== null).length;
  const avgCost = totalCost !== null && costRuns > 0 ? totalCost / costRuns : null;

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="md">
        <Title order={4}>
          Stats · {reports.length} run{reports.length === 1 ? '' : 's'}
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
          <StatTile
            label="Latency, seconds"
            value={`${formatLatency(avgLat)}`}
            sub={`(${formatLatency(minLat)} ~ ${formatLatency(maxLat)})`}
          />
          <StatTile
            label="Completion tokens"
            value={stat(totalTokens.length ? sum(totalTokens) : null)}
            sub={`in ${stat(promptTokens.length ? sum(promptTokens) : null)} / out ${stat(completionTokens.length ? sum(completionTokens) : null)}`}
          />
          <StatTile
            label="Total cost"
            value={`${formatCost(totalCost)}`}
            sub={`(${formatCost(avgCost)}/run)`}
          />
        </SimpleGrid>

        <Group gap="xs" align="center">
          <Text size="sm" c="dimmed">
            Identification consistency:
          </Text>
          {idPct !== null ? (
            <Badge color={idPct === 100 ? 'teal' : idPct >= 80 ? 'yellow' : 'red'}>
              {idPct}% same name
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">—</Text>
          )}
        </Group>

        <Stack gap="xs">
          <Text size="sm" fw={600}>Per-stress-sign consistency</Text>
          <Group gap="xs">
            {consistency.map(({ column, status, pct, evaluated }) => (
              <Tooltip
                key={column.stressSignId}
                label={`${column.name}: ${status} on ${evaluated}/${reports.length} evaluated runs`}
              >
                <Badge
                  variant="light"
                  color={pct === 100 ? 'teal' : pct === null ? 'gray' : pct >= 80 ? 'yellow' : 'red'}
                >
                  {column.name}: {pct === null ? '—' : `${pct}%`}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
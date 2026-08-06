import {
  Badge,
  Card,
  Flex,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import type { PlantReportEvalDto } from '@plant-doctor/api-types';
import { computeRunCost, computeTotalCost, formatCost } from '../utils/llm-pricing';
import { formatLatency } from '../utils/formatters';
import {
  consistencyColor,
  modalMatchPct,
  modalSetMatchPct,
  overallScoreFrom,
  signConsistency,
} from '../utils/eval-scoring';

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

  // Identification consistency: share of runs matching the most frequent
  // identified name (the modal "truth"), not just the first run.
  const { pct: idPct, matchCount: idMatchCount, modal: modalName } =
    modalMatchPct(reports.map((r) => r.identifiedPlantName));

  // Stressor consistency: share of runs matching the most frequent stressor
  // set (the modal "truth").
  const { pct: stressorPct, matchCount: stressorMatchCount } = modalSetMatchPct(
    reports.map((r) => r.likelyStressors),
  );

  // Mean per-stress-sign consistency (only signs that were evaluated count).
  const signScoreValues = consistency
    .map((c) => c.score)
    .filter((v): v is number => v !== null);
  const meanSignScore =
    signScoreValues.length > 0
      ? Math.round(sum(signScoreValues) / signScoreValues.length)
      : null;

  // Overall consistency /100: equal-weight average of the three components
  // that are available.
  const overallScore = overallScoreFrom(idPct, stressorPct, meanSignScore);

  // Latest run's photo (reports come back newest-first). Prefer the thumbnail
  // when available.
  const photoUrl =
    reports[0]?.photo?.imageUrl ?? null;

  const totalCost = computeTotalCost(reports);
  const costRuns = reports.filter((r) => computeRunCost(r.llmRequest) !== null).length;
  const avgCost = totalCost !== null && costRuns > 0 ? totalCost / costRuns : null;

  // Distinct LLM models used across the runs (latest first — reports come back
  // newest-first from the eval endpoint). Shown in the title so runs against
  // different models can be told apart.
  const models = Array.from(
    new Set(reports.map((r) => r.llmRequest?.model).filter(Boolean) as string[]),
  );
  const modelLabel =
    models.length === 0
      ? null
      : models.length === 1
        ? models[0]
        : `${models[0]} +${models.length - 1}`;

  return (
    <Card withBorder radius="md" padding="md">
      <Group gap="md" align="stretch">
        <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
            <Title order={4}>
              Stats · {reports.length} run{reports.length === 1 ? '' : 's'}
              {modelLabel && (
                <Text component="span" size="sm" c="dimmed" fw={400} ml="xs">
                  · {modelLabel}
                </Text>
              )}
            </Title>
            <Tooltip
              label={`Identification ${idPct ?? '—'}% · Stressors ${stressorPct ?? '—'}% · Stress signs ${meanSignScore ?? '—'}%`}
              multiline
              w={220}
            >
              <Stack gap={2} align="flex-end">
                <Text size="xs" c="dimmed">Overall consistency</Text>
                <Text size="xl" fw={800} c={consistencyColor(overallScore)}>
                  {overallScore === null ? '—' : `${overallScore}/100`}
                </Text>
              </Stack>
            </Tooltip>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
            <StatTile
              label="Latency, seconds"
              value={`${formatLatency(avgLat)}`}
              sub={`(${formatLatency(minLat)} ~ ${formatLatency(maxLat)})`}
            />
            <StatTile
              label="Tokens"
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
              Consistency:
            </Text>
            {idPct !== null ? (
              <Tooltip label={`${idMatchCount}/${reports.length} runs match the most frequent name${modalName ? ` (${modalName})` : ''}`}>
                <Badge color={consistencyColor(idPct)}>
                  {idPct}% same name
                </Badge>
              </Tooltip>
            ) : (
              <Text size="sm" c="dimmed">— name</Text>
            )}
            {stressorPct !== null ? (
              <Tooltip label={`${stressorMatchCount}/${reports.length} runs match the most frequent stressor set`}>
                <Badge color={consistencyColor(stressorPct)}>
                  {stressorPct}% same stressors
                </Badge>
              </Tooltip>
            ) : (
              <Text size="sm" c="dimmed">— stressors</Text>
            )}
          </Group>

          <Stack gap="xs">
            <Text size="sm" fw={600}>Per-stress-sign consistency</Text>
            <Group gap="xs">
              {consistency.map(({ column, score, counts, evaluated }) => (
                <Tooltip
                  key={column.stressSignId}
                  label={`${column.name}: ${score === null ? '—' : `${score}%`} consistent · present ${counts.present}/${evaluated}, absent ${counts.absent}/${evaluated}, unknown ${counts.unknown}/${evaluated}`}
                  multiline
                  w={260}
                >
                  <Badge
                    variant="light"
                    color={consistencyColor(score)}
                  >
                    {column.name}: {score === null ? '—' : `${score}%`}
                  </Badge>
                </Tooltip>
              ))}
            </Group>
          </Stack>
        </Stack>

        {photoUrl && (
          <Image
            radius="md"
            fit="cover"
            src={photoUrl}
            alt={reports[0]?.plantName ?? 'Latest report photo'}
            maw={220}
            mah={280}
            style={{ flex: '0 0 auto', alignSelf: 'center' }}
          />
        )}
      </Group>
    </Card>
  );
}
import { useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import { config } from '../config';
import styles from '../app.module.css';
import {
  STRESS_QUESTIONS,
  type StressCategory,
  type StressQuestion,
} from './agent-stress-questions';
import {
  applyPart,
  initialResult,
  parseSseChunk,
  type AggregatedResult,
  type ToolCall,
  type ThreadMeta,
} from './agentStreamParser';

interface AgentStressTestPanelProps {
  plantId: number;
  reportId: number;
  plantName: string;
}

type RunStatus = 'idle' | 'running' | 'done' | 'error';

interface RunResult {
  status: RunStatus;
  text: string;
  toolCalls: ToolCall[];
  thread?: ThreadMeta;
  error?: string;
}

type Filter = 'all' | StressCategory;

const CATEGORY_LABEL: Record<StressCategory, string> = {
  'tool-use': 'Tool use',
  'plant-care': 'Plant care',
  'off-topic': 'Off-topic',
};

const CATEGORY_COLOR: Record<StressCategory, string> = {
  'tool-use': 'teal',
  'plant-care': 'indigo',
  'off-topic': 'orange',
};

const EMPTY_RESULT: RunResult = {
  status: 'idle',
  text: '',
  toolCalls: [],
};

/**
 * "Agent stress test" tab. Fires a curated list of predefined questions at the
 * Python backend-agent's `POST /chat/agent/stream`, one at a time, each as a
 * FIRST turn (no `thread_id`) so every run starts a fresh chat scoped to the
 * current plant + report — no history carries between questions. Shows the
 * agent's answer and which tools it called, so tool-use, plant-care handling,
 * and guardrails can be eyeballed across the list. Questions live in
 * `agent-stress-questions.ts`.
 */
export function AgentStressTestPanel({
  plantId,
  reportId,
  plantName,
}: AgentStressTestPanelProps) {
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [runningAll, setRunningAll] = useState(false);

  const questions =
    filter === 'all'
      ? STRESS_QUESTIONS
      : STRESS_QUESTIONS.filter((q) => q.category === filter);

  function setResult(id: string, patch: Partial<RunResult> & { status: RunStatus }) {
    setResults((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? EMPTY_RESULT), ...patch },
    }));
  }

  /** Run one question against the agent stream. Fresh chat every time: no
   *  `thread_id`, so the agent mints a new chat (and we ignore the throwaway
   *  chats row). `report_id` pins the context to the current report. */
  async function runQuestion(q: StressQuestion): Promise<void> {
    setResult(q.id, { status: 'running', text: '', toolCalls: [], error: undefined });
    try {
      const res = await fetch(`${config.agentUrl}/chat/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
        body: JSON.stringify({
          plant_id: plantId,
          message: q.prompt,
          report_id: reportId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? `Request failed with ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buf = '';
      let agg: AggregatedResult = initialResult;
      const flush = (state: AggregatedResult) => {
        setResult(q.id, {
          status: 'running',
          text: state.text,
          toolCalls: state.toolCalls,
          thread: state.thread,
          error: state.error,
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(chunk, buf);
        buf = parsed.rest;
        for (const part of parsed.parts) {
          agg = applyPart(agg, part);
          flush(agg);
        }
      }
      // Flush any trailing bytes, then any final leftover event.
      const tail = decoder.decode();
      if (tail || buf) {
        const parsed = parseSseChunk(tail, buf);
        for (const part of parsed.parts) {
          agg = applyPart(agg, part);
          flush(agg);
        }
      }

      setResult(q.id, {
        status: agg.error ? 'error' : 'done',
        text: agg.text,
        toolCalls: agg.toolCalls,
        thread: agg.thread,
        error: agg.error,
      });
    } catch (err) {
      setResult(q.id, {
        status: 'error',
        text: '',
        toolCalls: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function runAll() {
    setRunningAll(true);
    try {
      for (const q of questions) {
        await runQuestion(q);
      }
    } finally {
      setRunningAll(false);
    }
  }

  function clearAll() {
    setResults({});
  }

  return (
    <Stack gap="md">
      <Group gap="sm" align="baseline">
        <Text fw={500}>Agent stress test</Text>
        <Code>POST /chat/agent/stream</Code>
        <Text size="sm" c="dimmed">
          plantId={plantId} · reportId={reportId} · plant=&quot;{plantName}&quot; ·
          userId={RESEARCH_USER_ID}
        </Text>
      </Group>

      <Text size="sm" c="dimmed">
        Each question starts a <b>fresh chat</b> (no history) scoped to the current
        plant + report. Tool calls are shown live as the agent acts.
      </Text>

      <Group gap="sm" align="center">
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          onClick={runAll}
          loading={runningAll}
        >
          Run all ({questions.length})
        </Button>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconTrash size={16} />}
          onClick={clearAll}
          disabled={runningAll}
        >
          Clear
        </Button>
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          data={[
            { value: 'all', label: 'All' },
            { value: 'tool-use', label: 'Tool use' },
            { value: 'plant-care', label: 'Plant care' },
            { value: 'off-topic', label: 'Off-topic' },
          ]}
        />
      </Group>

      <Stack gap="sm">
        {questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            result={results[q.id] ?? EMPTY_RESULT}
            running={results[q.id]?.status === 'running'}
            disabled={runningAll}
            onRun={() => runQuestion(q)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function QuestionCard({
  question,
  result,
  running,
  disabled,
  onRun,
}: {
  question: StressQuestion;
  result: RunResult;
  running: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  const calledNames = result.toolCalls.map((tc) => tc.toolName);
  const expected = question.expectsTool ?? [];
  const missingExpected = expected.filter((t) => !calledNames.includes(t));

  return (
    <Card className={styles.panel} radius="lg" padding="lg">
      <Stack gap="sm">
        <Group gap="xs" align="baseline">
          <Text fw={500}>{question.label}</Text>
          <Badge color={CATEGORY_COLOR[question.category]} variant="light" size="sm">
            {CATEGORY_LABEL[question.category]}
          </Badge>
        </Group>

        <Box component="pre" className={styles.logPreMono}>
          {question.prompt}
        </Box>

        {expected.length > 0 ? (
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed">
              Expects:
            </Text>
            {expected.map((t) => (
              <Badge key={t} size="xs" variant="outline">
                {t}
              </Badge>
            ))}
          </Group>
        ) : null}

        <Group gap="xs" align="center">
          <Button
            size="xs"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={onRun}
            loading={running}
            disabled={disabled}
          >
            Run
          </Button>
          {running ? <Loader size="xs" /> : null}
          {result.thread?.chat_token ? (
            <Text size="xs" c="dimmed">
              chat: <Code>{result.thread.chat_token}</Code>
              {result.thread.default_report_id != null
                ? ` · report ${result.thread.default_report_id}`
                : ''}
            </Text>
          ) : null}
        </Group>

        {result.toolCalls.length > 0 ? (
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Called tools:
            </Text>
            <Group gap="xs">
              {result.toolCalls.map((tc) => (
                <Badge
                  key={tc.toolCallId}
                  size="sm"
                  color={expected.includes(tc.toolName) ? 'teal' : 'orange'}
                  variant="filled"
                >
                  {tc.toolName}
                </Badge>
              ))}
            </Group>
            {missingExpected.length > 0 ? (
              <Text size="xs" c="orange">
                Not called: {missingExpected.join(', ')}
              </Text>
            ) : null}
          </Stack>
        ) : null}

        {result.error ? (
          <Alert color="red" title="Error">
            {result.error}
          </Alert>
        ) : null}

        {result.text ? (
          <Box component="pre" className={styles.logPreMono}>
            {result.text}
          </Box>
        ) : result.status === 'running' && !result.error ? (
          <Text size="sm" c="dimmed">
            Running…
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
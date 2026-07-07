import {
  Alert,
  Box,
  Button,
  Code,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLlmRequest } from '../queries';
import { formatDate } from '../utils/formatters';
import styles from '../app.module.css';

interface LlmRequestLogTableProps {
  llmRequestId: number | null;
}

const TEXT_PREVIEW_LIMIT = 160;

function truncate(value: string, limit: number) {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= limit) return singleLine;
  return `${singleLine.slice(0, limit)}…`;
}

function jsonKeyCount(value: Record<string, unknown> | null) {
  if (!value) return 0;
  return Object.keys(value).length;
}

function prettyJson(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// A table row whose value is too wordy to render inline. Collapsed shows a
// one-line preview (and a count for JSON); the expand button reveals the full
// content in a monospace, wrapping block.
function CollapsibleRow({
  field,
  preview,
  full,
  mono = true,
}: {
  field: string;
  preview: string;
  full: string;
  mono?: boolean;
}) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Table.Tr>
      <Table.Td className={styles.logFieldCell}>{field}</Table.Td>
      <Table.Td>
        <Stack gap={4}>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" c="dimmed" className={styles.logPreview}>
              {preview}
            </Text>
            <Button
              size="compact-xs"
              variant="light"
              onClick={toggle}
              flex="0 0 auto"
            >
              {opened ? 'Collapse' : 'Expand'}
            </Button>
          </Group>
          {opened ? (
            <Box
              component="pre"
              className={mono ? styles.logPreMono : styles.logPre}
            >
              {full}
            </Box>
          ) : null}
        </Stack>
      </Table.Td>
    </Table.Tr>
  );
}

export function LlmRequestLogTable({ llmRequestId }: LlmRequestLogTableProps) {
  const llmRequestQuery = useLlmRequest(llmRequestId);

  if (llmRequestId === null) {
    return (
      <Stack gap="md">
        <Title order={3}>LLM request log</Title>
        <Text c="dimmed">No request log is linked to this report.</Text>
      </Stack>
    );
  }

  if (llmRequestQuery.isLoading) {
    return <Loader />;
  }

  if (llmRequestQuery.error || !llmRequestQuery.data) {
    return (
      <Stack gap="md">
        <Title order={3}>LLM request log</Title>
        <Alert color="red" title="Error">
          {llmRequestQuery.error?.message ?? 'LLM request log not found'}
        </Alert>
      </Stack>
    );
  }

  const request = llmRequestQuery.data;
  const requestMetadataJson = request.requestMetadata
    ? prettyJson(request.requestMetadata)
    : null;
  const responseMetadataJson = request.responseMetadata
    ? prettyJson(request.responseMetadata)
    : null;

  return (
    <Stack gap="md">
      <Title order={3}>LLM request log</Title>
      <Table
        horizontalSpacing="sm"
        verticalSpacing="sm"
        className={styles.logTable}
        withTableBorder
        withColumnBorders
        layout="fixed"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th className={styles.logFieldHeader}>Field</Table.Th>
            <Table.Th>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>id</Table.Td>
            <Table.Td>
              <Code>{request.id}</Code>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>action</Table.Td>
            <Table.Td>
              <Text size="sm">{request.action}</Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>provider</Table.Td>
            <Table.Td>
              <Text size="sm">{request.provider ?? '—'}</Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>model</Table.Td>
            <Table.Td>
              <Text size="sm">{request.model ?? '—'}</Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>latency_ms</Table.Td>
            <Table.Td>
              <Text size="sm">
                {request.latencyMs !== null ? `${request.latencyMs} ms` : '—'}
              </Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>created_at</Table.Td>
            <Table.Td>
              <Text size="sm">{formatDate(request.createdAt)}</Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>plant_id</Table.Td>
            <Table.Td>
              <Text size="sm">{request.plantId ?? '—'}</Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td className={styles.logFieldCell}>plant_report_id</Table.Td>
            <Table.Td>
              <Text size="sm">{request.plantReportId ?? '—'}</Text>
            </Table.Td>
          </Table.Tr>
          {request.error ? (
            <Table.Tr>
              <Table.Td className={styles.logFieldCell}>error</Table.Td>
              <Table.Td>
                <Text size="sm" c="red">{request.error}</Text>
              </Table.Td>
            </Table.Tr>
          ) : null}
          <CollapsibleRow
            field="prompt"
            preview={truncate(request.prompt, TEXT_PREVIEW_LIMIT)}
            full={request.prompt}
          />
          <CollapsibleRow
            field="response"
            preview={
              request.response
                ? truncate(request.response, TEXT_PREVIEW_LIMIT)
                : '—'
            }
            full={request.response ?? '—'}
          />
          <CollapsibleRow
            field="request_metadata"
            preview={
              requestMetadataJson
                ? `{ ${jsonKeyCount(request.requestMetadata)} keys }`
                : '—'
            }
            full={requestMetadataJson ?? '—'}
          />
          <CollapsibleRow
            field="response_metadata"
            preview={
              responseMetadataJson
                ? `{ ${jsonKeyCount(request.responseMetadata)} keys }`
                : '—'
            }
            full={responseMetadataJson ?? '—'}
          />
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
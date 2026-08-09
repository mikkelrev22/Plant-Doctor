import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Code,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import {
  agentLookAtPhoto,
  agentPlantHistory,
  agentPlantReports,
  agentUserPlants,
  createAgentChat,
} from '../api/api';
import styles from '../app.module.css';

interface AgentRequestsPanelProps {
  plantId: number;
  reportId: number;
  plantName: string;
}

/**
 * Two-column request/response shell for one agent endpoint. Owns the loading,
 * response, and error state; the parent owns the input controls (passed as
 * `requestControls`) and supplies `onSend`, which reads those inputs, calls the
 * api wrapper, and returns the response text (or throws — shown as a red
 * Alert). For JSON-returning endpoints the caller stringifies before returning
 * so this shell always treats the response as a string.
 */
function ToolForm({
  title,
  method,
  path,
  disabled,
  disabledReason,
  requestControls,
  onSend,
}: {
  title: string;
  method: string;
  path: string;
  disabled?: boolean;
  disabledReason?: string;
  requestControls: ReactNode;
  onSend: () => Promise<string>;
}) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const text = await onSend();
      setResponse(text);
    } catch (err) {
      setResponse('');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={styles.panel} radius="lg" padding="lg">
      <Stack gap="sm">
        <Group gap="xs" align="baseline">
          <Text fw={500}>{title}</Text>
          <Code>{`${method} ${path}`}</Code>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Stack gap="sm">
            {requestControls}
            <Group gap="xs" align="center">
              <Button onClick={handleSend} loading={loading} disabled={disabled}>
                Send
              </Button>
              {disabled && disabledReason ? (
                <Text size="sm" c="dimmed">
                  {disabledReason}
                </Text>
              ) : null}
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">
              Response
            </Text>
            {error ? (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            ) : response ? (
              <Box component="pre" className={styles.logPreMono}>
                {response}
              </Box>
            ) : (
              <Text size="sm" c="dimmed">
                No response yet
              </Text>
            )}
          </Stack>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

/** POST /agent/chats — mints the token shared by every tool form below. */
function GetTokenCard({
  plantId,
  onToken,
}: {
  plantId: number;
  onToken: (result: {
    chatToken: string;
    contextText: string;
    defaultReportId: number | null;
  }) => void;
}) {
  const [plantIdText, setPlantIdText] = useState(String(plantId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState('');

  async function handleGetToken() {
    setLoading(true);
    setError(null);
    try {
      const data = await createAgentChat(Number(plantIdText));
      const pretty = JSON.stringify(data, null, 2);
      setResult(pretty);
      onToken({
        chatToken: data.chatToken,
        contextText: data.contextText,
        defaultReportId: data.defaultReportId,
      });
    } catch (err) {
      setResult('');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={styles.panel} radius="lg" padding="lg">
      <Stack gap="sm">
        <Group gap="xs" align="baseline">
          <Text fw={500}>Get token</Text>
          <Code>POST /agent/chats</Code>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Stack gap="sm">
            <TextInput
              label="plantId"
              value={plantIdText}
              onChange={(e) => setPlantIdText(e.currentTarget.value)}
            />
            <Group gap="xs" align="center">
              <Button onClick={handleGetToken} loading={loading}>
                Get token
              </Button>
              {loading ? <Loader size="xs" /> : null}
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">
              Response
            </Text>
            {error ? (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            ) : result ? (
              <Box component="pre" className={styles.logPreMono}>
                {result}
              </Box>
            ) : (
              <Text size="sm" c="dimmed">
                No token yet — click Get token to start a chat for this plant.
              </Text>
            )}
          </Stack>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

function PlantReportsForm({ token, plantId }: { token: string; plantId: number }) {
  const [plantIdText, setPlantIdText] = useState(String(plantId));

  return (
    <ToolForm
      title="Plant reports"
      method="GET"
      path="/agent/plantReports"
      disabled={!token}
      disabledReason={!token ? 'Get a token first' : undefined}
      requestControls={
        <TextInput
          label="plantId (blank = chat's default plant)"
          value={plantIdText}
          onChange={(e) => setPlantIdText(e.currentTarget.value)}
        />
      }
      onSend={async () =>
        agentPlantReports(token, plantIdText ? Number(plantIdText) : undefined)
      }
    />
  );
}

function PlantHistoryForm({ token, plantId }: { token: string; plantId: number }) {
  const [plantIdText, setPlantIdText] = useState(String(plantId));

  return (
    <ToolForm
      title="Plant history"
      method="GET"
      path="/agent/plantHistory"
      disabled={!token}
      disabledReason={!token ? 'Get a token first' : undefined}
      requestControls={
        <TextInput
          label="plantId (blank = chat's default plant)"
          value={plantIdText}
          onChange={(e) => setPlantIdText(e.currentTarget.value)}
        />
      }
      onSend={async () =>
        agentPlantHistory(token, plantIdText ? Number(plantIdText) : undefined)
      }
    />
  );
}

function UserPlantsForm({ token }: { token: string }) {
  return (
    <ToolForm
      title="User plants"
      method="GET"
      path="/agent/userPlants"
      disabled={!token}
      disabledReason={!token ? 'Get a token first' : undefined}
      requestControls={
        <Text size="sm" c="dimmed">
          No request body — lists the user&apos;s plants (capped at 10).
        </Text>
      }
      onSend={async () => agentUserPlants(token)}
    />
  );
}

function LookAtPhotoForm({
  token,
  defaultReportId,
  reportId,
}: {
  token: string;
  defaultReportId: number | null;
  reportId: number;
}) {
  const [reportIdText, setReportIdText] = useState(
    String(defaultReportId ?? reportId),
  );
  const [query, setQuery] = useState('What is wrong with this plant?');

  return (
    <ToolForm
      title="Look at photo"
      method="POST"
      path="/agent/lookAtPhoto"
      disabled={!token}
      disabledReason={!token ? 'Get a token first' : undefined}
      requestControls={
        <>
          <TextInput
            label="reportId (blank = chat's default report)"
            value={reportIdText}
            onChange={(e) => setReportIdText(e.currentTarget.value)}
          />
          <Textarea
            label="query"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            minRows={2}
          />
        </>
      }
      onSend={async () =>
        agentLookAtPhoto(token, {
          reportId: reportIdText ? Number(reportIdText) : undefined,
          query,
        })
      }
    />
  );
}

export function AgentRequestsPanel({
  plantId,
  reportId,
  plantName,
}: AgentRequestsPanelProps) {
  // The chat token is shared by every tool form — minted once via Get token.
  const [token, setToken] = useState('');
  const [defaultReportId, setDefaultReportId] = useState<number | null>(null);

  return (
    <Stack gap="md">
      <Group gap="sm" align="baseline">
        <Title order={3}>Agent requests</Title>
        <Text size="sm" c="dimmed">
          plantId={plantId} · reportId={reportId} · plant=&quot;{plantName}&quot; ·
          userId={RESEARCH_USER_ID}
        </Text>
      </Group>

      <GetTokenCard
        plantId={plantId}
        onToken={({ chatToken, defaultReportId: dri }) => {
          setToken(chatToken);
          setDefaultReportId(dri);
        }}
      />

      <PlantReportsForm token={token} plantId={plantId} />
      <PlantHistoryForm token={token} plantId={plantId} />
      <UserPlantsForm token={token} />
      <LookAtPhotoForm
        token={token}
        defaultReportId={defaultReportId}
        reportId={reportId}
      />
    </Stack>
  );
}
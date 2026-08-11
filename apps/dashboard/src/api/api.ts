import type {
  AnalyzeReportResponse,
  ChatHistoryDto,
  CreateChatResponseDto,
  LlmRequestDetailDto,
  PlantDto,
  PlantListItemDto,
  PlantListItemEvalDto,
  PlantReportDetailDto,
  PlantReportEvalDto,
  PlantReportExtendedDto,
  PlantReportSummaryDto,
  ReasoningEffort,
  StressSignDto,
} from '@plant-doctor/api-types';
import { config } from '../config';

/**
 * Dashboard API client for the Plant-Doctor Node backend (apps/backend).
 *
 * Consumes the backend's `consumer`, `admin`, AND `agent` route groups — the
 * dashboard is a superset of the mobile-app's consumer surface (it calls the
 * same plants / reports endpoints) plus the admin-only eval / llm-requests /
 * config / stress-signs / architecture endpoints, plus the `/agent` namespace
 * (exercised by the Report page's Agent requests test console). See
 * apps/backend/src/app/routes/ and docs/backend-endpoints.md for the
 * per-consumer grouping and the per-group authorization.
 */

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.backendUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      'x-api-key': config.apiKey,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Like {@link fetchJson}, but returns the response body as text — used for the
 * `/agent` tool endpoints, which respond `text/plain`. Error bodies are still
 * JSON (`{ message }`) per Fastify's default error serializer, so the error
 * path parses them the same way fetchJson does. A 204 (e.g. `saveChat`) yields
 * an empty string.
 */
async function fetchText(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(`${config.backendUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      'x-api-key': config.apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = text;
    try {
      const body = JSON.parse(text) as { message?: string } | null;
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the raw text.
    }
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.text();
}

export function getPlants() {
  return fetchJson<PlantListItemDto[]>('/plants');
}

export function getPlantsForEval() {
  return fetchJson<PlantListItemEvalDto[]>('/plants/evals');
}

export function getPlant(id: number) {
  return fetchJson<PlantDto>(`/plants/${id}`);
}

export function updatePlantName(id: number, name: string) {
  return fetchJson<PlantDto>(`/plants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function updatePlantNotes(id: number, notes: string | null) {
  return fetchJson<PlantDto>(`/plants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

export function createPlant(name?: string) {
  return fetchJson<PlantDto>('/plants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function getStressSigns() {
  return fetchJson<StressSignDto[]>('/stress-signs');
}

export function getPlantReports(plantId: number) {
  return fetchJson<PlantReportSummaryDto[]>(`/plants/${plantId}/reports`);
}

export function getPlantReportsExtended(plantId: number) {
  return fetchJson<PlantReportExtendedDto[]>(
    `/plants/${plantId}/reports/extended`,
  );
}

export function getPlantReportsEval(plantId: number) {
  return fetchJson<PlantReportEvalDto[]>(`/plants/${plantId}/reports/eval`);
}

export function getReport(reportId: number) {
  return fetchJson<PlantReportDetailDto>(`/reports/${reportId}`);
}

export function getLlmRequest(llmRequestId: number) {
  return fetchJson<LlmRequestDetailDto>(`/llm-requests/${llmRequestId}`);
}

// Live backend LLM config (currently just the model name) for display. Read-only.
export function getLlmConfig() {
  return fetchJson<{ model: string }>('/config/llm');
}

export function analyzePlantReport(params: {
  image: File;
  plantId?: number;
  plantName?: string;
  process?: boolean;
  temperature?: number;
  reasoningEffort?: ReasoningEffort;
}) {
  const formData = new FormData();

  if (params.plantId) {
    formData.append('plantId', String(params.plantId));
  }

  if (params.plantName) {
    formData.append('plantName', params.plantName);
  }

  if (params.process !== undefined) {
    formData.append('process', String(params.process));
  }

  if (params.temperature !== undefined) {
    formData.append('temperature', String(params.temperature));
  }

  if (params.reasoningEffort !== undefined) {
    formData.append('reasoningEffort', params.reasoningEffort);
  }

  formData.append('image', params.image);

  return fetchJson<AnalyzeReportResponse>('/reports/analyze', {
    method: 'POST',
    body: formData,
  });
}

// ---------------------------------------------------------------------------
// /agent — the backend-py (LangGraph) gateway namespace. `POST /agent/chats`
// mints the opaque chat token (no token header); every other route requires an
// `x-chat-token` header (validated by the group preHandler). The four tool
// endpoints return plain text; the chat-lifecycle ones return JSON. See
// docs/backend-endpoints.md.
// ---------------------------------------------------------------------------

/** POST /agent/chats — mints a chat token + initial plain-text context.
 *  Pass `reportId` to pin the chat to a specific report instead of the plant's
 *  latest report (so a chat can be scoped to an older report). */
export function createAgentChat(plantId: number, reportId?: number) {
  return fetchJson<CreateChatResponseDto>('/agent/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportId != null ? { plantId, reportId } : { plantId }),
  });
}

/** GET /agent/chats/:chatToken — the saved history blob. */
export function getAgentChat(chatToken: string) {
  return fetchJson<ChatHistoryDto>(
    `/agent/chats/${encodeURIComponent(chatToken)}`,
    { headers: { 'x-chat-token': chatToken } },
  );
}

/** PUT /agent/chats/:chatToken — overwrites the history blob. Returns 204. */
export function saveAgentChat(chatToken: string, history: unknown) {
  return fetchText(`/agent/chats/${encodeURIComponent(chatToken)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-chat-token': chatToken },
    body: JSON.stringify({ history }),
  });
}

/** GET /agent/plantReports — last 3 reports for the plant, full detail. Plain text. */
export function agentPlantReports(chatToken: string, plantId?: number) {
  const qs = plantId != null ? `?plantId=${plantId}` : '';
  return fetchText(`/agent/plantReports${qs}`, {
    headers: { 'x-chat-token': chatToken },
  });
}

/** GET /agent/plantHistory — every report for the plant, briefly. Plain text. */
export function agentPlantHistory(chatToken: string, plantId?: number) {
  const qs = plantId != null ? `?plantId=${plantId}` : '';
  return fetchText(`/agent/plantHistory${qs}`, {
    headers: { 'x-chat-token': chatToken },
  });
}

/** GET /agent/userPlants — the user's plants (capped at 10). Plain text. */
export function agentUserPlants(chatToken: string) {
  return fetchText('/agent/userPlants', { headers: { 'x-chat-token': chatToken } });
}

/** POST /agent/lookAtPhoto — vision LLM answer about a report's photo. Plain text. */
export function agentLookAtPhoto(
  chatToken: string,
  body: { reportId?: number; query: string },
) {
  return fetchText('/agent/lookAtPhoto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chat-token': chatToken },
    body: JSON.stringify(body),
  });
}

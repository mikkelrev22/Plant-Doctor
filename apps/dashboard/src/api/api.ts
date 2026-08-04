import type {
  AnalyzeReportResponse,
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

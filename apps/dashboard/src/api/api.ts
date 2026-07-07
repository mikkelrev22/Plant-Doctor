import type {
  AnalyzeReportResponse,
  PlantDto,
  PlantReportDetailDto,
  PlantReportSummaryDto,
  StressSignDto,
} from '@plant-doctor/api-types';
import { config } from '../config';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.backendUrl}${path}`, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getPlants() {
  return fetchJson<PlantDto[]>('/plants');
}

export function getPlant(id: number) {
  return fetchJson<PlantDto>(`/plants/${id}`);
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

export function getReport(reportId: number) {
  return fetchJson<PlantReportDetailDto>(`/reports/${reportId}`);
}

export function analyzePlantReport(params: {
  image: File;
  plantId?: number;
  plantName?: string;
  process?: boolean;
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

  formData.append('image', params.image);

  return fetchJson<AnalyzeReportResponse>('/reports/analyze', {
    method: 'POST',
    body: formData,
  });
}

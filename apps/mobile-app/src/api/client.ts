import type {
  AnalyzeReportResponse,
  ApiErrorResponse,
  PlantDto,
  PlantListItemDto,
  PlantReportDetailDto,
  PlantReportExtendedDto,
  RootResponse,
} from '@plant-doctor/api-types';
import { Platform } from 'react-native';

/**
 * Fetch-based client for the Plant-Doctor Node backend (apps/backend).
 *
 * NOTE on secrets: `EXPO_PUBLIC_*` vars are inlined at build time and exposed in
 * the client bundle, so `EXPO_PUBLIC_BACKEND_API_KEY` is NOT secret. This
 * matches how the existing web frontends bundle `BACKEND_API_KEY` — it's a
 * stopgap gate, not real auth, and is acceptable for the single-user prototype.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4100';
const API_KEY = process.env.EXPO_PUBLIC_BACKEND_API_KEY ?? '';

/** Typed error thrown for any non-2xx response. Carries the HTTP status. */
export class ApiError extends Error {
  readonly status: number;
  readonly error?: string;

  constructor(status: number, message: string, error?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
  }
}

function withBase(path: string): string {
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'x-api-key': API_KEY, ...(extra ?? {}) };
}

/** Parse a non-2xx response into a typed `ApiError`. */
async function toApiError(res: Response): Promise<ApiError> {
  let body: ApiErrorResponse | undefined;
  try {
    body = (await res.json()) as ApiErrorResponse;
  } catch {
    body = undefined;
  }
  const message = body?.message ?? res.statusText ?? 'Request failed';
  return new ApiError(res.status, message, body?.error);
}

/** JSON request helper used by the typed endpoint functions below. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = authHeaders(
    init?.body && !(init.body instanceof FormData)
      ? { 'content-type': 'application/json' }
      : undefined,
  );
  const res = await fetch(withBase(path), { ...init, headers });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

/** GET / — backend health/version probe (API-key exempt, safe to call pre-login). */
export function getHealth(): Promise<RootResponse> {
  return request<RootResponse>('/');
}

/** GET /plants — list of plants with derived thumbnail + report count. */
export function listPlants(): Promise<PlantListItemDto[]> {
  return request<PlantListItemDto[]>('/plants');
}

/** GET /plants/:id — a single plant. */
export function getPlant(id: number): Promise<PlantDto> {
  return request<PlantDto>(`/plants/${id}`);
}

/** PATCH /plants/:id — rename a plant. Duplicate names surface as an error. */
export function updatePlantName(id: number, name: string): Promise<PlantDto> {
  return request<PlantDto>(`/plants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

/** PATCH /plants/:id — update a plant's free-text notes. Pass null to clear. */
export function updatePlantNotes(
  id: number,
  notes: string | null,
): Promise<PlantDto> {
  return request<PlantDto>(`/plants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

/** GET /plants/:id/reports/extended — report history with per-report stress
 *  signs (all 16 signs, unknown/none defaults for unevaluated ones). Used by
 *  the reports list to render the stress-sign dots before a report is opened. */
export function listReportsExtended(
  plantId: number,
): Promise<PlantReportExtendedDto[]> {
  return request<PlantReportExtendedDto[]>(
    `/plants/${plantId}/reports/extended`,
  );
}

/** GET /reports/:id — full report with photo, stress signs, and LLM log summary. */
export function getReport(id: number): Promise<PlantReportDetailDto> {
  return request<PlantReportDetailDto>(`/reports/${id}`);
}

export interface AnalyzeParams {
  imageUri: string;
  /** MIME type of the captured/picked image (e.g. `image/jpeg`). */
  mimeType: string;
  /** ISO 8601 moment the photo was taken (EXIF `DateTimeOriginal`, or now for
   *  camera shots). When omitted the server dates the report with the current time. */
  capturedAt?: string;
  /** When set, attach the report to this existing plant; otherwise the server creates one. */
  plantId?: number;
  /** Optional plant name used when no plantId is provided. */
  plantName?: string;
}

/**
 * POST /reports/analyze — multipart upload. Never set `Content-Type`; let the
 * platform set the multipart boundary.
 *
 * - Native: RN `FormData`/`fetch` accept a `{ uri, name, type }` object directly.
 * - Web: `expo-image-picker` returns a blob URI; fetch it to a `Blob` first so
 *   the browser `FormData` serializes the actual bytes.
 */
export async function analyzeReport(params: AnalyzeParams): Promise<AnalyzeReportResponse> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blobRes = await fetch(params.imageUri);
    const blob = await blobRes.blob();
    form.append('image', blob, filenameFor(params.mimeType));
  } else {
    form.append('image', {
      uri: params.imageUri,
      name: filenameFor(params.mimeType),
      type: params.mimeType,
    } as unknown as Blob);
  }

  if (params.plantId != null) form.append('plantId', String(params.plantId));
  if (params.plantName) form.append('plantName', params.plantName);
  if (params.capturedAt) form.append('capturedAt', params.capturedAt);

  const res = await fetch(withBase('/reports/analyze'), {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as AnalyzeReportResponse;
}

/** Derive a sensible filename from a MIME type (the server doesn't care about the name). */
function filenameFor(mimeType: string): string {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  return `plant.${ext}`;
}
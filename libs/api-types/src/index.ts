export const RESEARCH_USER_ID = 1;

export const stressSignStatuses = ['present', 'absent', 'unknown'] as const;
export type StressSignStatus = (typeof stressSignStatuses)[number];

export const stressSeverityLevels = [
  'none',
  'mild',
  'moderate',
  'severe',
] as const;
export type StressSeverity = (typeof stressSeverityLevels)[number];

// Fireworks/Qwen3 reasoning effort for the analysis call. 'none' skips the
// thinking block (faster, fine for structured JSON); 'low' | 'medium' | 'high'
// re-enable reasoning. Sent per-request from the eval UI; defaults to 'none'.
export const reasoningEffortLevels = ['none', 'low', 'medium', 'high'] as const;
export type ReasoningEffort = (typeof reasoningEffortLevels)[number];

export interface PlantDto {
  id: number;
  name: string;
  species: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlantListItemDto extends PlantDto {
  thumbnailUrl: string | null;
  reportCount: number;
}

// Extended plant list item for the eval tool: adds the distinct LLM model names
// used across the plant's reports (latest first), so runs against different
// models can be told apart in the "Past eval tables" list. Served by a separate
// GET /plants/evals endpoint that can be disabled in production independently of
// the general GET /plants list.
export interface PlantListItemEvalDto extends PlantListItemDto {
  models: string[];
}

export interface CreatePlantRequest {
  name?: string;
}

export interface StressVariableDto {
  id: string;
  name: string;
}

export interface StressSignDto {
  id: string;
  name: string;
  sortOrder: number;
  variables: StressVariableDto[];
}

export interface PlantPhotoDto {
  id: number;
  imageUrl: string;
  storageKey: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  capturedAt: string | null;
  createdAt: string;
}

export interface ReportStressSignDto {
  stressSignId: string;
  name: string;
  status: StressSignStatus;
  severity: StressSeverity;
  confidence: number | null;
  notes: string | null;
  variables: StressVariableDto[];
}

export interface LlmRequestSummaryDto {
  id: number;
  action: string;
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
}

export interface LlmRequestDetailDto extends LlmRequestSummaryDto {
  plantId: number | null;
  plantReportId: number | null;
  prompt: string;
  response: string | null;
  requestMetadata: Record<string, unknown> | null;
  responseMetadata: Record<string, unknown> | null;
}

export interface PlantReportSummaryDto {
  id: number;
  plantId: number;
  plantName: string;
  reportedAt: string;
  identifiedPlantName: string | null;
  scientificName: string | null;
  identificationConfidence: number | null;
  likelyStressors: string[];
  summary: string;
  recommendations: string;
  photo: PlantPhotoDto | null;
}

export interface PlantReportExtendedDto extends PlantReportSummaryDto {
  stressSigns: ReportStressSignDto[];
}

// LLM metrics for a report, extracted from the `llm_requests` row. Token counts
// are parsed from the provider `usage` object stored in `response_metadata`
// (latency/model/error are direct columns). Used by the eval tool to compare
// consistency and cost across consecutive /reports/analyze runs.
export interface LlmRequestMetricsDto {
  id: number;
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  // Prompt tokens served from the provider's cache (OpenAI
  // `usage.prompt_tokens_details.cached_tokens`). Null when the provider
  // doesn't report cache details; cost calc then prices all input as uncached.
  cachedTokens: number | null;
  // Sampling params captured per-request in `request_metadata` (not direct
  // columns). Null for legacy rows that predate persisting them.
  temperature: number | null;
  reasoningEffort: ReasoningEffort | null;
  error: string | null;
  createdAt: string;
}

// One row in an eval results table: an extended report plus the LLM metrics for
// the run that produced it. Served by GET /plants/:plantId/reports/eval so an
// eval table can be reopened any time, like the regular plant reports view.
export interface PlantReportEvalDto extends PlantReportExtendedDto {
  llmRequest: LlmRequestMetricsDto | null;
}

export interface PlantReportDetailDto extends PlantReportSummaryDto {
  stressSigns: ReportStressSignDto[];
  llmRequest: LlmRequestSummaryDto | null;
}

export interface AnalyzeReportResponse {
  plant: PlantDto;
  report: PlantReportDetailDto;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export interface LlmStressSignResult {
  stressSignId: string;
  status: StressSignStatus;
  severity: StressSeverity;
  confidence: number | null;
  notes: string;
}

// A region of the image showing stress, for later highlight overlays. `bbox` is
// in normalized fractions 0.0–1.0 of the image dimensions (x, y = top-left
// corner), so it maps to any rendered size regardless of the variant the LLM
// saw. `stressSignId` ties the box to a checklist sign.
export interface LlmDetectedRegion {
  stressSignId: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface LlmPlantAnalysisResult {
  identifiedPlantName: string;
  scientificName: string | null;
  identificationConfidence: number | null;
  likelyStressors: string[];
  summary: string;
  stressSigns: LlmStressSignResult[];
  detectedRegions: LlmDetectedRegion[];
}

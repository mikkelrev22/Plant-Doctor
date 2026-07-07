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

export interface PlantDto {
  id: number;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlantListItemDto extends PlantDto {
  thumbnailUrl: string | null;
  reportCount: number;
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

export interface LlmPlantAnalysisResult {
  identifiedPlantName: string;
  scientificName: string | null;
  identificationConfidence: number | null;
  likelyStressors: string[];
  summary: string;
  recommendations: string;
  stressSigns: LlmStressSignResult[];
  detectedRegions: number;
}

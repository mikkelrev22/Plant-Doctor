import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  analyzePlantReport,
  getLlmConfig,
  getLlmRequest,
  getPlant,
  getPlantReports,
  getPlantReportsEval,
  getPlantReportsExtended,
  getPlants,
  getPlantsForEval,
  getReport,
  getStressSigns,
  updatePlantName,
  updatePlantNotes,
} from './api/api';

export const plantKeys = {
  all: ['plants'] as const,
  forEval: ['plants', 'eval'] as const,
  byId: (plantId: number) => [...plantKeys.all, 'detail', plantId] as const,
};

export const stressSignKeys = {
  all: ['stress-signs'] as const,
};

export const reportKeys = {
  all: ['reports'] as const,
  byPlant: (plantId: number) => [...reportKeys.all, 'plant', plantId] as const,
  byPlantExtended: (plantId: number) =>
    [...reportKeys.all, 'plant-extended', plantId] as const,
  byPlantEval: (plantId: number) =>
    [...reportKeys.all, 'plant-eval', plantId] as const,
  byId: (reportId: number) => [...reportKeys.all, 'detail', reportId] as const,
};

export const llmRequestKeys = {
  all: ['llm-requests'] as const,
  byId: (llmRequestId: number) =>
    [...llmRequestKeys.all, 'detail', llmRequestId] as const,
};

export function usePlants() {
  return useQuery<PlantListItemDto[]>({
    queryKey: plantKeys.all,
    queryFn: getPlants,
  });
}

// Eval-only plant list (GET /plants/evals) carrying the LLM model names used per
// plant. Separate from usePlants so the endpoint can be disabled in production.
export function usePlantsForEval() {
  return useQuery<PlantListItemEvalDto[]>({
    queryKey: plantKeys.forEval,
    queryFn: getPlantsForEval,
  });
}

export function usePlant(plantId: number | null) {
  return useQuery<PlantDto>({
    queryKey: plantKeys.byId(plantId ?? 0),
    queryFn: () => {
      if (plantId === null) throw new Error('plantId is required');
      return getPlant(plantId);
    },
    enabled: plantId !== null,
  });
}

export function useStressSigns() {
  return useQuery<StressSignDto[]>({
    queryKey: stressSignKeys.all,
    queryFn: getStressSigns,
  });
}

export function usePlantReports(plantId: number | null) {
  return useQuery<PlantReportSummaryDto[]>({
    queryKey: reportKeys.byPlant(plantId ?? 0),
    queryFn: () => {
      if (plantId === null) throw new Error('plantId is required');
      return getPlantReports(plantId);
    },
    enabled: plantId !== null,
  });
}

export function usePlantReportsExtended(plantId: number | null) {
  return useQuery<PlantReportExtendedDto[]>({
    queryKey: reportKeys.byPlantExtended(plantId ?? 0),
    queryFn: () => {
      if (plantId === null) throw new Error('plantId is required');
      return getPlantReportsExtended(plantId);
    },
    enabled: plantId !== null,
  });
}

export function usePlantReportsEval(plantId: number | null) {
  return useQuery<PlantReportEvalDto[]>({
    queryKey: reportKeys.byPlantEval(plantId ?? 0),
    queryFn: () => {
      if (plantId === null) throw new Error('plantId is required');
      return getPlantReportsEval(plantId);
    },
    enabled: plantId !== null,
  });
}

export function useReport(reportId: number | null) {
  return useQuery<PlantReportDetailDto>({
    queryKey: reportKeys.byId(reportId ?? 0),
    queryFn: () => {
      if (reportId === null) throw new Error('reportId is required');
      return getReport(reportId);
    },
    enabled: reportId !== null,
  });
}

// Live backend LLM config (model name) for display on the Eval page. The value
// is fixed at backend startup from env, so it won't change mid-session — cache
// it for the session rather than refetching on every mount.
export function useLlmConfig() {
  return useQuery<{ model: string }>({
    queryKey: ['llm-config'],
    queryFn: getLlmConfig,
    staleTime: Infinity,
  });
}

export function useLlmRequest(llmRequestId: number | null) {
  return useQuery<LlmRequestDetailDto>({
    queryKey: llmRequestKeys.byId(llmRequestId ?? 0),
    queryFn: () => {
      if (llmRequestId === null) throw new Error('llmRequestId is required');
      return getLlmRequest(llmRequestId);
    },
    enabled: llmRequestId !== null,
  });
}

export function useAnalyzeReport() {
  const queryClient = useQueryClient();

  return useMutation<AnalyzeReportResponse, Error, {
    image: File;
    plantId?: number;
    plantName?: string;
    temperature?: number;
    reasoningEffort?: ReasoningEffort;
  }>({
    mutationFn: analyzePlantReport,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plantKeys.all });
      queryClient.invalidateQueries({ queryKey: plantKeys.forEval });
      queryClient.invalidateQueries({
        queryKey: reportKeys.byPlant(data.plant.id),
      });
      queryClient.invalidateQueries({
        queryKey: reportKeys.byPlantExtended(data.plant.id),
      });
      queryClient.invalidateQueries({
        queryKey: reportKeys.byPlantEval(data.plant.id),
      });
    },
  });
}

export function useUpdatePlantName() {
  const queryClient = useQueryClient();

  return useMutation<PlantDto, Error, { id: number; name: string }>({
    mutationFn: ({ id, name }) => updatePlantName(id, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plantKeys.all });
      queryClient.invalidateQueries({ queryKey: plantKeys.byId(data.id) });
    },
  });
}

export function useUpdatePlantNotes() {
  const queryClient = useQueryClient();

  return useMutation<PlantDto, Error, { id: number; notes: string | null }>({
    mutationFn: ({ id, notes }) => updatePlantNotes(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plantKeys.all });
      queryClient.invalidateQueries({ queryKey: plantKeys.byId(data.id) });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnalyzeReportResponse,
  LlmRequestDetailDto,
  PlantDto,
  PlantListItemDto,
  PlantReportDetailDto,
  PlantReportExtendedDto,
  PlantReportSummaryDto,
  StressSignDto,
} from '@plant-doctor/api-types';
import {
  analyzePlantReport,
  deletePlant,
  getLlmRequest,
  getPlant,
  getPlantReports,
  getPlantReportsExtended,
  getPlants,
  getReport,
  getStressSigns,
  updatePlantName,
} from './api/api';

export const plantKeys = {
  all: ['plants'] as const,
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
  }>({
    mutationFn: analyzePlantReport,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plantKeys.all });
      queryClient.invalidateQueries({
        queryKey: reportKeys.byPlant(data.plant.id),
      });
      queryClient.invalidateQueries({
        queryKey: reportKeys.byPlantExtended(data.plant.id),
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

export function useDeletePlant() {
  const queryClient = useQueryClient();

  return useMutation<PlantDto, Error, number>({
    mutationFn: (id) => deletePlant(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: plantKeys.all });
      // The plant no longer exists, so remove its cached detail query rather
      // than refetching it (which would 404).
      queryClient.removeQueries({ queryKey: plantKeys.byId(data.id) });
    },
  });
}

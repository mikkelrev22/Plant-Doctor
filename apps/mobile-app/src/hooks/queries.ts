import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AnalyzeReportResponse } from '@plant-doctor/api-types';
import {
  analyzeReport,
  type AnalyzeParams,
  getPlant,
  getReport,
  listPlants,
  listReports,
  listReportsExtended,
  updatePlantName,
  updatePlantNotes,
} from '@/api/client';
import { qk } from '@/api/query-keys';

/** GET /plants */
export function usePlants() {
  return useQuery({ queryKey: qk.plants, queryFn: listPlants });
}

/** GET /plants/:id */
export function usePlant(id: number) {
  return useQuery({
    queryKey: qk.plant(id),
    queryFn: () => getPlant(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** GET /plants/:id/reports (latest first) */
export function useReports(plantId: number) {
  return useQuery({
    queryKey: qk.reports(plantId),
    queryFn: () => listReports(plantId),
    enabled: Number.isFinite(plantId) && plantId > 0,
  });
}

/** GET /plants/:id/reports/extended (latest first) — report history with
 *  per-report stress signs, used to render the stress-sign dots on report rows
 *  before a report is opened. */
export function useReportsExtended(plantId: number) {
  return useQuery({
    queryKey: qk.reportsExtended(plantId),
    queryFn: () => listReportsExtended(plantId),
    enabled: Number.isFinite(plantId) && plantId > 0,
  });
}

/** GET /reports/:id */
export function useReport(id: number) {
  return useQuery({
    queryKey: qk.report(id),
    queryFn: () => getReport(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** PATCH /plants/:id — rename. Updates the plant cache and invalidates the list. */
export function useUpdatePlantName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updatePlantName(id, name),
    onSuccess: (plant, { id }) => {
      qc.setQueryData(qk.plant(id), plant);
      qc.invalidateQueries({ queryKey: qk.plants });
    },
  });
}

/** PATCH /plants/:id — update notes. Pass null to clear. Replaces the plant
 * cache and invalidates the plants list (mirrors useUpdatePlantName). */
export function useUpdatePlantNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string | null }) =>
      updatePlantNotes(id, notes),
    onSuccess: (plant, { id }) => {
      qc.setQueryData(qk.plant(id), plant);
      qc.invalidateQueries({ queryKey: qk.plants });
    },
  });
}

/** POST /reports/analyze. Invalidates the plants list + the plant's reports. */
export function useAnalyzeReport() {
  const qc = useQueryClient();
  return useMutation<AnalyzeReportResponse, Error, AnalyzeParams>({
    mutationFn: (params) => analyzeReport(params),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.plants });
      qc.invalidateQueries({ queryKey: qk.reports(data.plant.id) });
      // `reportsExtended` is a descendent of `reports`, so the line above
      // already covers it; kept explicit for clarity and to survive any future
      // key-shape drift.
      qc.invalidateQueries({ queryKey: qk.reportsExtended(data.plant.id) });
      qc.setQueryData(qk.plant(data.plant.id), data.plant);
      qc.setQueryData(qk.report(data.report.id), data.report);
    },
  });
}
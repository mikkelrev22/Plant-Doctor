import type {
  ReasoningEffort,
  ReportStressSignDto,
  StressSeverity,
  StressSignStatus,
} from '@plant-doctor/api-types';
import {
  reasoningEffortLevels,
  stressSeverityLevels,
  stressSignStatuses,
} from '@plant-doctor/api-types';

/**
 * Coerces an untrusted value to a {@link StressSignStatus}, defaulting to
 * `'unknown'` when it isn't a known status. Replaces the bare
 * `(row.status ?? 'unknown') as StressSignStatus` casts that were scattered
 * across the report/plant services — a `text` column can hold anything, so a
 * membership check is safer than a cast.
 */
export function toStressSignStatus(value: unknown): StressSignStatus {
  return typeof value === 'string' &&
    (stressSignStatuses as readonly string[]).includes(value)
    ? (value as StressSignStatus)
    : 'unknown';
}

/** Coerces an untrusted value to a {@link StressSeverity}, defaulting to `'none'`. */
export function toStressSeverity(value: unknown): StressSeverity {
  return typeof value === 'string' &&
    (stressSeverityLevels as readonly string[]).includes(value)
    ? (value as StressSeverity)
    : 'none';
}

/**
 * Coerces an untrusted value to a {@link ReasoningEffort}, returning `null`
 * when it isn't a known level. Replaces `meta.reasoningEffort as ReasoningEffort`
 * — membership-checked against {@link reasoningEffortLevels} so an unexpected
 * string is dropped rather than stored as a bogus effort.
 */
export function toReasoningEffort(value: unknown): ReasoningEffort | null {
  return typeof value === 'string' &&
    (reasoningEffortLevels as readonly string[]).includes(value)
    ? (value as ReasoningEffort)
    : null;
}

/**
 * A flattened stress-sign row as produced by the report/plant join queries:
 * one row per (report, sign, variable), with the variable fields nullable so
 * signs without variables still produce a row.
 */
export interface StressSignRow {
  /** `stress_signs.id` — the sign's stable id. */
  id: string;
  name: string;
  status: string | null;
  severity: string | null;
  confidence: number | null;
  notes: string | null;
  variableId: string | null;
  variableName: string | null;
}

/** A {@link StressSignRow} that also carries its owning report id. */
export interface ReportStressSignRow extends StressSignRow {
  reportId: number | null;
}

/**
 * Builds a {@link ReportStressSignDto} skeleton (empty `variables`) from a
 * single flattened row. Callers that group multiple rows per sign append
 * variables via {@link pushVariable}.
 */
export function buildReportStressSignDto(
  row: StressSignRow,
): ReportStressSignDto {
  return {
    stressSignId: row.id,
    name: row.name,
    status: toStressSignStatus(row.status),
    severity: toStressSeverity(row.severity),
    confidence: row.confidence,
    notes: row.notes,
    variables: [],
  };
}

/** Appends the row's variable (if any) to an existing sign DTO, in place. */
export function pushVariable(
  sign: ReportStressSignDto,
  row: StressSignRow,
): void {
  if (row.variableId && row.variableName) {
    sign.variables.push({ id: row.variableId, name: row.variableName });
  }
}

/**
 * Groups flattened stress-sign rows for a single report into a
 * `signId -> ReportStressSignDto` map, accumulating variables across rows that
 * share a sign. Mirrors the grouping `getReportDetail` previously inlined.
 */
export function groupStressSigns(
  rows: StressSignRow[],
): Map<string, ReportStressSignDto> {
  const signsById = new Map<string, ReportStressSignDto>();
  for (const row of rows) {
    const sign = signsById.get(row.id) ?? buildReportStressSignDto(row);
    pushVariable(sign, row);
    signsById.set(row.id, sign);
  }
  return signsById;
}

/**
 * Groups flattened stress-sign rows across many reports into a
 * `reportId -> (signId -> ReportStressSignDto)` map. Rows with a null
 * `reportId` are skipped. Mirrors the grouping duplicated across
 * `listReportsForPlantExtended` and `listReportsForPlantEval`.
 */
export function groupStressSignsByReport(
  rows: ReportStressSignRow[],
): Map<number, Map<string, ReportStressSignDto>> {
  const byReport = new Map<number, Map<string, ReportStressSignDto>>();
  for (const row of rows) {
    if (row.reportId === null) {
      continue;
    }
    const signsForReport =
      byReport.get(row.reportId) ?? new Map<string, ReportStressSignDto>();
    const sign = signsForReport.get(row.id) ?? buildReportStressSignDto(row);
    pushVariable(sign, row);
    signsForReport.set(row.id, sign);
    byReport.set(row.reportId, signsForReport);
  }
  return byReport;
}

/**
 * Keeps the first row per `plantReportId`, assuming `rows` are already ordered
 * so the first occurrence is the desired one. Generic over the row type so it
 * works for any projection without coupling this helper to drizzle. Used for
 * "earliest photo per report" (rows ordered `plantReportId ASC, createdAt ASC`)
 * and "latest LLM request per report" (rows ordered `plantReportId ASC,
 * createdAt DESC`) — the helper just keeps the first per report by order.
 */
export function pickFirstByReportId<T extends { plantReportId: number | null }>(
  rows: T[],
): Map<number, T> {
  const byReportId = new Map<number, T>();
  for (const row of rows) {
    const reportId = row.plantReportId;
    if (reportId !== null && !byReportId.has(reportId)) {
      byReportId.set(reportId, row);
    }
  }
  return byReportId;
}
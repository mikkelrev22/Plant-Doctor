import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type {
  LlmPlantAnalysisResult,
  LlmRequestDetailDto,
  LlmRequestMetricsDto,
  LlmRequestSummaryDto,
  PlantDto,
  PlantPhotoDto,
  PlantReportDetailDto,
  PlantReportEvalDto,
  PlantReportExtendedDto,
  PlantReportSummaryDto,
  ReportStressSignDto,
  StressSeverity,
  StressSignStatus,
} from '@plant-doctor/api-types';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import type { Database } from '@plant-doctor/db';
import {
  llmRequests,
  plantPhotos,
  plantReports,
  plantReportStressSigns,
  plants,
  stressSigns,
  stressSignVariables,
  stressVariables,
} from '@plant-doctor/db/schema';
import type { StoredUpload } from './uploads.service';

function clampConfidence(value: number | null) {
  if (value === null) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Extracts token counts from the OpenAI-compatible `usage` object that lives
// inside `llm_requests.response_metadata`. Returns nulls when the provider did
// not return usage (e.g. failed requests or a provider without usage). Cache-hit
// prompt tokens come from `usage.prompt_tokens_details.cached_tokens` (OpenAI
// shape); null when the provider doesn't report cache details — callers then
// treat all prompt tokens as uncached.
function parseUsage(meta: Record<string, unknown> | null | undefined) {
  const usage = isRecord(meta) && isRecord(meta.usage) ? meta.usage : undefined;
  const details =
    usage && isRecord(usage.prompt_tokens_details)
      ? usage.prompt_tokens_details
      : undefined;
  const num = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  return {
    promptTokens: num(usage?.prompt_tokens),
    completionTokens: num(usage?.completion_tokens),
    totalTokens: num(usage?.total_tokens),
    cachedTokens: num(details?.cached_tokens),
  };
}

function toPhotoDto(photo: typeof plantPhotos.$inferSelect): PlantPhotoDto {
  return {
    id: photo.id,
    imageUrl: photo.imageUrl,
    storageKey: photo.storageKey,
    mimeType: photo.mimeType,
    width: photo.width,
    height: photo.height,
    thumbnailUrl: photo.thumbnailUrl,
    thumbnailWidth: photo.thumbnailWidth,
    thumbnailHeight: photo.thumbnailHeight,
    capturedAt: photo.capturedAt?.toISOString() ?? null,
    createdAt: photo.createdAt.toISOString(),
  };
}

function toLlmRequestSummary(
  request: typeof llmRequests.$inferSelect,
): LlmRequestSummaryDto {
  return {
    id: request.id,
    action: request.action,
    provider: request.provider,
    model: request.model,
    latencyMs: request.latencyMs,
    error: request.error,
    createdAt: request.createdAt.toISOString(),
  };
}

function toLlmRequestDetail(
  request: typeof llmRequests.$inferSelect,
): LlmRequestDetailDto {
  return {
    ...toLlmRequestSummary(request),
    plantId: request.plantId,
    plantReportId: request.plantReportId,
    prompt: request.prompt,
    response: request.response,
    requestMetadata: request.requestMetadata,
    responseMetadata: request.responseMetadata,
  };
}

function payloadFromReport(
  report: typeof plantReports.$inferSelect,
): LlmPlantAnalysisResult | null {
  return report.reportPayload ?? null;
}

function summaryFromRow(params: {
  report: typeof plantReports.$inferSelect;
  plant: typeof plants.$inferSelect;
  photo: typeof plantPhotos.$inferSelect | null;
}): PlantReportSummaryDto {
  const payload = payloadFromReport(params.report);

  return {
    id: params.report.id,
    plantId: params.plant.id,
    plantName: params.plant.name,
    reportedAt: params.report.reportedAt.toISOString(),
    identifiedPlantName: payload?.identifiedPlantName ?? null,
    scientificName: payload?.scientificName ?? null,
    identificationConfidence: payload?.identificationConfidence ?? null,
    likelyStressors:
      payload?.likelyStressors ??
      params.report.stressors
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    summary: params.report.summary,
    recommendations: params.report.recommendations,
    photo: params.photo ? toPhotoDto(params.photo) : null,
  };
}

export async function createLlmRequestLog(
  db: Database,
  params: {
    plantId: number;
    prompt: string;
    requestMetadata: Record<string, unknown>;
  },
) {
  const [request] = await db
    .insert(llmRequests)
    .values({
      userId: RESEARCH_USER_ID,
      plantId: params.plantId,
      action: 'plant_report_analysis',
      prompt: params.prompt,
      provider: 'openai-compatible',
      model: params.requestMetadata.model as string | undefined,
      requestMetadata: params.requestMetadata,
    })
    .returning();

  if (!request) {
    throw new Error('Unable to create LLM request log');
  }

  return request.id;
}

export async function markLlmRequestSucceeded(
  db: Database,
  params: {
    llmRequestId: number;
    response: string;
    responseMetadata: Record<string, unknown>;
    latencyMs: number;
  },
) {
  await db
    .update(llmRequests)
    .set({
      response: params.response,
      responseMetadata: params.responseMetadata,
      latencyMs: params.latencyMs,
      error: null,
    })
    .where(eq(llmRequests.id, params.llmRequestId));
}

export async function markLlmRequestFailed(
  db: Database,
  params: {
    llmRequestId: number;
    error: string;
    latencyMs?: number;
  },
) {
  await db
    .update(llmRequests)
    .set({
      error: params.error,
      latencyMs: params.latencyMs,
    })
    .where(eq(llmRequests.id, params.llmRequestId));
}

// Loads a single LLM request log (full prompt, response, and metadata) for the
// Research User. Ownership is enforced via `userId` so a caller can't read
// another user's log by guessing the serial id.
export async function getLlmRequestDetail(
  db: Database,
  llmRequestId: number,
): Promise<LlmRequestDetailDto | null> {
  const [request] = await db
    .select()
    .from(llmRequests)
    .where(
      and(
        eq(llmRequests.id, llmRequestId),
        eq(llmRequests.userId, RESEARCH_USER_ID),
      ),
    )
    .limit(1);

  return request ? toLlmRequestDetail(request) : null;
}

export async function createReportFromAnalysis(
  db: Database,
  params: {
    plant: PlantDto;
    upload: StoredUpload;
    analysis: LlmPlantAnalysisResult;
    llmRequestId: number;
    /** When the photo was taken (from EXIF), if known. When null/undefined the
     *  report falls back to `reported_at` DEFAULT now() and the photo's
     *  `captured_at` stays NULL. `created_at` is always the real insert time. */
    capturedAt?: Date | null;
  },
): Promise<PlantReportDetailDto> {
  const reportId = await db.transaction(async (tx) => {
    const [report] = await tx
      .insert(plantReports)
      .values({
        plantId: params.plant.id,
        // `undefined` lets the column's DEFAULT now() apply; a Date overrides it
        // so the report's timeline reflects when the photo was taken.
        reportedAt: params.capturedAt ?? undefined,
        stressors: params.analysis.likelyStressors.join(', '),
        summary: params.analysis.summary,
        // Recommendations are no longer generated by the LLM (it can't produce
        // good ones without a reasoning block). The column is NOT NULL, so we
        // store an empty string for now; care advice will be reintroduced later.
        recommendations: '',
        reportPayload: params.analysis,
      })
      .returning();

    if (!report) {
      throw new Error('Unable to create plant report');
    }

    await tx.insert(plantPhotos).values({
      plantId: params.plant.id,
      plantReportId: report.id,
      imageUrl: params.upload.imageUrl,
      storageKey: params.upload.storageKey,
      mimeType: params.upload.mimeType,
      width: params.upload.width,
      height: params.upload.height,
      thumbnailUrl: params.upload.thumbnail.imageUrl,
      thumbnailStorageKey: params.upload.thumbnail.storageKey,
      thumbnailWidth: params.upload.thumbnail.width,
      thumbnailHeight: params.upload.thumbnail.height,
      capturedAt: params.capturedAt ?? null,
    });

    // Load the seeded stress-sign ids once: they are the FK-restrict target and
    // the dedupe set. We persist only the signs the LLM actually evaluated with
    // a concrete verdict (present/absent) — unevaluated or unknown signs are
    // not stored, so per-report views show only detected signs.
    const seededIds = new Set(
      (await tx.select({ id: stressSigns.id }).from(stressSigns)).map(
        (sign) => sign.id,
      ),
    );

    // Dedupe by stressSignId (the composite PK is (plantReportId, stressSignId))
    // and drop any hallucinated id the LLM returned (FK to stress_signs is
    // RESTRICT) and any sign whose status is 'unknown'.
    const deduped = new Map<string, (typeof params.analysis.stressSigns)[number]>();
    for (const sign of params.analysis.stressSigns) {
      if (!seededIds.has(sign.stressSignId)) continue;
      deduped.set(sign.stressSignId, sign);
    }

    const stressSignRows = [...deduped.values()]
      .filter((result) => result.status !== 'unknown')
      .map((result) => {
        const status: StressSignStatus = result.status;
        const severity: StressSeverity =
          status === 'absent' ? 'none' : (result.severity ?? 'none');

        return {
          plantReportId: report.id,
          stressSignId: result.stressSignId,
          status,
          severity,
          confidence: clampConfidence(result.confidence ?? null),
          notes: result.notes ?? null,
        };
      });

    if (stressSignRows.length > 0) {
      await tx.insert(plantReportStressSigns).values(stressSignRows);
    }

    await tx
      .update(llmRequests)
      .set({ plantReportId: report.id })
      .where(eq(llmRequests.id, params.llmRequestId));

    return report.id;
  });

  const detail = await getReportDetail(db, reportId);

  if (!detail) {
    throw new Error('Unable to load created report');
  }

  return detail;
}

export async function listReportsForPlant(
  db: Database,
  plantId: number,
): Promise<PlantReportSummaryDto[]> {
  const rows = await db
    .select({
      report: plantReports,
      plant: plants,
    })
    .from(plantReports)
    .innerJoin(plants, eq(plants.id, plantReports.plantId))
    .where(
      and(
        eq(plants.userId, RESEARCH_USER_ID),
        eq(plantReports.plantId, plantId),
      ),
    )
    .orderBy(desc(plantReports.reportedAt));

  if (rows.length === 0) {
    return [];
  }

  // Fetch the earliest photo for every report in a single query (ordered by
  // createdAt ASC), then keep the first per report in memory — instead of one
  // query per report.
  const reportIds = rows.map((row) => row.report.id);
  const photoRows = await db
    .select()
    .from(plantPhotos)
    .where(inArray(plantPhotos.plantReportId, reportIds))
    .orderBy(asc(plantPhotos.plantReportId), asc(plantPhotos.createdAt));

  const photoByReportId = new Map<number, typeof plantPhotos.$inferSelect>();
  for (const photo of photoRows) {
    const reportId = photo.plantReportId;
    if (reportId !== null && !photoByReportId.has(reportId)) {
      photoByReportId.set(reportId, photo);
    }
  }

  return rows.map((row) =>
    summaryFromRow({
      report: row.report,
      plant: row.plant,
      photo: photoByReportId.get(row.report.id) ?? null,
    }),
  );
}

export async function listReportsForPlantExtended(
  db: Database,
  plantId: number,
): Promise<PlantReportExtendedDto[]> {
  const rows = await db
    .select({
      report: plantReports,
      plant: plants,
    })
    .from(plantReports)
    .innerJoin(plants, eq(plants.id, plantReports.plantId))
    .where(
      and(
        eq(plants.userId, RESEARCH_USER_ID),
        eq(plantReports.plantId, plantId),
      ),
    )
    .orderBy(desc(plantReports.reportedAt));

  if (rows.length === 0) {
    return [];
  }

  const reportIds = rows.map((row) => row.report.id);

  // Fetch the earliest photo per report and the full stress-sign evaluation for
  // every report in two batched queries, instead of one query per report.
  const [photoRows, stressRows] = await Promise.all([
    db
      .select()
      .from(plantPhotos)
      .where(inArray(plantPhotos.plantReportId, reportIds))
      .orderBy(asc(plantPhotos.plantReportId), asc(plantPhotos.createdAt)),
    db
      .select({
        reportId: plantReportStressSigns.plantReportId,
        id: stressSigns.id,
        name: stressSigns.name,
        status: plantReportStressSigns.status,
        severity: plantReportStressSigns.severity,
        confidence: plantReportStressSigns.confidence,
        notes: plantReportStressSigns.notes,
        variableId: stressVariables.id,
        variableName: stressVariables.name,
      })
      .from(stressSigns)
      .leftJoin(
        plantReportStressSigns,
        and(
          eq(plantReportStressSigns.stressSignId, stressSigns.id),
          inArray(plantReportStressSigns.plantReportId, reportIds),
        ),
      )
      .leftJoin(
        stressSignVariables,
        eq(stressSignVariables.stressSignId, stressSigns.id),
      )
      .leftJoin(
        stressVariables,
        eq(stressVariables.id, stressSignVariables.stressVariableId),
      )
      .orderBy(
        asc(plantReportStressSigns.plantReportId),
        asc(stressSigns.sortOrder),
        asc(stressVariables.name),
      ),
  ]);

  const photoByReportId = new Map<number, typeof plantPhotos.$inferSelect>();
  for (const photo of photoRows) {
    const reportId = photo.plantReportId;
    if (reportId !== null && !photoByReportId.has(reportId)) {
      photoByReportId.set(reportId, photo);
    }
  }

  // Group stress-sign rows by report, then by sign, accumulating variables per
  // sign — the same shape `getReportDetail` produces for a single report.
  const stressByReportId = new Map<
    number,
    Map<string, ReportStressSignDto>
  >();

  for (const stressRow of stressRows) {
    const reportId = stressRow.reportId;
    if (reportId === null) {
      continue;
    }

    const signsForReport =
      stressByReportId.get(reportId) ?? new Map<string, ReportStressSignDto>();
    const stressSign =
      signsForReport.get(stressRow.id) ??
      ({
        stressSignId: stressRow.id,
        name: stressRow.name,
        status: (stressRow.status ?? 'unknown') as StressSignStatus,
        severity: (stressRow.severity ?? 'none') as StressSeverity,
        confidence: stressRow.confidence,
        notes: stressRow.notes,
        variables: [],
      } satisfies ReportStressSignDto);

    if (stressRow.variableId && stressRow.variableName) {
      stressSign.variables.push({
        id: stressRow.variableId,
        name: stressRow.variableName,
      });
    }

    signsForReport.set(stressRow.id, stressSign);
    stressByReportId.set(reportId, signsForReport);
  }

  return rows.map((row) => {
    const signsForReport = stressByReportId.get(row.report.id);
    return {
      ...summaryFromRow({
        report: row.report,
        plant: row.plant,
        photo: photoByReportId.get(row.report.id) ?? null,
      }),
      stressSigns: signsForReport ? [...signsForReport.values()] : [],
    };
  });
}

function toLlmRequestMetrics(
  request: typeof llmRequests.$inferSelect,
): LlmRequestMetricsDto {
  return {
    id: request.id,
    provider: request.provider,
    model: request.model,
    latencyMs: request.latencyMs,
    ...parseUsage(request.responseMetadata),
    error: request.error,
    createdAt: request.createdAt.toISOString(),
  };
}

// Like listReportsForPlantExtended, but also batch-fetches the latest
// llm_requests row per report and exposes its metrics (latency, token usage
// parsed from response_metadata, model, error). Powers the eval results table
// at GET /plants/:plantId/reports/eval, which is reopenable any time.
export async function listReportsForPlantEval(
  db: Database,
  plantId: number,
): Promise<PlantReportEvalDto[]> {
  const rows = await db
    .select({
      report: plantReports,
      plant: plants,
    })
    .from(plantReports)
    .innerJoin(plants, eq(plants.id, plantReports.plantId))
    .where(
      and(
        eq(plants.userId, RESEARCH_USER_ID),
        eq(plantReports.plantId, plantId),
      ),
    )
    .orderBy(desc(plantReports.reportedAt));

  if (rows.length === 0) {
    return [];
  }

  const reportIds = rows.map((row) => row.report.id);

  // Photos, stress signs, and the latest LLM request log per report — three
  // batched queries instead of one per report. For llm_requests we order by
  // plantReportId ASC then createdAt DESC and keep the first per report.
  const [photoRows, stressRows, llmRequestRows] = await Promise.all([
    db
      .select()
      .from(plantPhotos)
      .where(inArray(plantPhotos.plantReportId, reportIds))
      .orderBy(asc(plantPhotos.plantReportId), asc(plantPhotos.createdAt)),
    db
      .select({
        reportId: plantReportStressSigns.plantReportId,
        id: stressSigns.id,
        name: stressSigns.name,
        status: plantReportStressSigns.status,
        severity: plantReportStressSigns.severity,
        confidence: plantReportStressSigns.confidence,
        notes: plantReportStressSigns.notes,
        variableId: stressVariables.id,
        variableName: stressVariables.name,
      })
      .from(stressSigns)
      .leftJoin(
        plantReportStressSigns,
        and(
          eq(plantReportStressSigns.stressSignId, stressSigns.id),
          inArray(plantReportStressSigns.plantReportId, reportIds),
        ),
      )
      .leftJoin(
        stressSignVariables,
        eq(stressSignVariables.stressSignId, stressSigns.id),
      )
      .leftJoin(
        stressVariables,
        eq(stressVariables.id, stressSignVariables.stressVariableId),
      )
      .orderBy(
        asc(plantReportStressSigns.plantReportId),
        asc(stressSigns.sortOrder),
        asc(stressVariables.name),
      ),
    db
      .select()
      .from(llmRequests)
      .where(inArray(llmRequests.plantReportId, reportIds))
      .orderBy(asc(llmRequests.plantReportId), desc(llmRequests.createdAt)),
  ]);

  const photoByReportId = new Map<number, typeof plantPhotos.$inferSelect>();
  for (const photo of photoRows) {
    const reportId = photo.plantReportId;
    if (reportId !== null && !photoByReportId.has(reportId)) {
      photoByReportId.set(reportId, photo);
    }
  }

  const llmRequestByReportId = new Map<
    number,
    typeof llmRequests.$inferSelect
  >();
  for (const request of llmRequestRows) {
    const reportId = request.plantReportId;
    if (reportId !== null && !llmRequestByReportId.has(reportId)) {
      llmRequestByReportId.set(reportId, request);
    }
  }

  // Group stress-sign rows by report, then by sign, accumulating variables per
  // sign — the same shape used by listReportsForPlantExtended.
  const stressByReportId = new Map<
    number,
    Map<string, ReportStressSignDto>
  >();

  for (const stressRow of stressRows) {
    const reportId = stressRow.reportId;
    if (reportId === null) {
      continue;
    }

    const signsForReport =
      stressByReportId.get(reportId) ?? new Map<string, ReportStressSignDto>();
    const stressSign =
      signsForReport.get(stressRow.id) ??
      ({
        stressSignId: stressRow.id,
        name: stressRow.name,
        status: (stressRow.status ?? 'unknown') as StressSignStatus,
        severity: (stressRow.severity ?? 'none') as StressSeverity,
        confidence: stressRow.confidence,
        notes: stressRow.notes,
        variables: [],
      } satisfies ReportStressSignDto);

    if (stressRow.variableId && stressRow.variableName) {
      stressSign.variables.push({
        id: stressRow.variableId,
        name: stressRow.variableName,
      });
    }

    signsForReport.set(stressRow.id, stressSign);
    stressByReportId.set(reportId, signsForReport);
  }

  return rows.map((row) => {
    const signsForReport = stressByReportId.get(row.report.id);
    const llmRequest = llmRequestByReportId.get(row.report.id);
    return {
      ...summaryFromRow({
        report: row.report,
        plant: row.plant,
        photo: photoByReportId.get(row.report.id) ?? null,
      }),
      stressSigns: signsForReport ? [...signsForReport.values()] : [],
      llmRequest: llmRequest ? toLlmRequestMetrics(llmRequest) : null,
    };
  });
}

export async function getReportDetail(
  db: Database,
  reportId: number,
): Promise<PlantReportDetailDto | null> {
  // The report lookup enforces ownership (RESEARCH_USER_ID); the photo, LLM
  // request, and stress-sign queries only depend on `reportId`, so we can run
  // all four in parallel and bail out if the report isn't found.
  const [reportRows, photoRows, llmRequestRows, stressRows] = await Promise.all([
    db
      .select({
        report: plantReports,
        plant: plants,
      })
      .from(plantReports)
      .innerJoin(plants, eq(plants.id, plantReports.plantId))
      .where(
        and(eq(plants.userId, RESEARCH_USER_ID), eq(plantReports.id, reportId)),
      )
      .limit(1),
    db
      .select()
      .from(plantPhotos)
      .where(eq(plantPhotos.plantReportId, reportId))
      .orderBy(asc(plantPhotos.createdAt))
      .limit(1),
    db
      .select()
      .from(llmRequests)
      .where(eq(llmRequests.plantReportId, reportId))
      .orderBy(desc(llmRequests.createdAt))
      .limit(1),
    db
      .select({
        id: stressSigns.id,
        name: stressSigns.name,
        status: plantReportStressSigns.status,
        severity: plantReportStressSigns.severity,
        confidence: plantReportStressSigns.confidence,
        notes: plantReportStressSigns.notes,
        variableId: stressVariables.id,
        variableName: stressVariables.name,
      })
      .from(plantReportStressSigns)
      .innerJoin(
        stressSigns,
        eq(stressSigns.id, plantReportStressSigns.stressSignId),
      )
      .leftJoin(
        stressSignVariables,
        eq(stressSignVariables.stressSignId, stressSigns.id),
      )
      .leftJoin(
        stressVariables,
        eq(stressVariables.id, stressSignVariables.stressVariableId),
      )
      .where(
        and(
          eq(plantReportStressSigns.plantReportId, reportId),
          ne(plantReportStressSigns.status, 'unknown'),
        ),
      )
      .orderBy(
        // Present signs first, absent last; then by definition sort order,
        // then by variable name for deterministic within-sign ordering.
        sql`CASE ${plantReportStressSigns.status} WHEN 'present' THEN 0 ELSE 1 END`,
        asc(stressSigns.sortOrder),
        asc(stressVariables.name),
      ),
  ]);

  const row = reportRows[0];
  if (!row) {
    return null;
  }

  const photo = photoRows[0] ?? null;
  const llmRequest = llmRequestRows[0];
  const stressSignsById = new Map<string, ReportStressSignDto>();

  for (const stressRow of stressRows) {
    const stressSign =
      stressSignsById.get(stressRow.id) ??
      ({
        stressSignId: stressRow.id,
        name: stressRow.name,
        status: (stressRow.status ?? 'unknown') as StressSignStatus,
        severity: (stressRow.severity ?? 'none') as StressSeverity,
        confidence: stressRow.confidence,
        notes: stressRow.notes,
        variables: [],
      } satisfies ReportStressSignDto);

    if (stressRow.variableId && stressRow.variableName) {
      stressSign.variables.push({
        id: stressRow.variableId,
        name: stressRow.variableName,
      });
    }

    stressSignsById.set(stressRow.id, stressSign);
  }

  return {
    ...summaryFromRow({
      report: row.report,
      plant: row.plant,
      photo,
    }),
    stressSigns: [...stressSignsById.values()],
    llmRequest: llmRequest ? toLlmRequestSummary(llmRequest) : null,
  };
}

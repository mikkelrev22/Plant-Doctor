import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type {
  LlmPlantAnalysisResult,
  LlmRequestDetailDto,
  LlmRequestSummaryDto,
  PlantDto,
  PlantPhotoDto,
  PlantReportDetailDto,
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
  },
): Promise<PlantReportDetailDto> {
  const reportId = await db.transaction(async (tx) => {
    const [report] = await tx
      .insert(plantReports)
      .values({
        plantId: params.plant.id,
        stressors: params.analysis.likelyStressors.join(', '),
        summary: params.analysis.summary,
        recommendations: params.analysis.recommendations,
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
    });

    const seededSigns = await tx
      .select({ id: stressSigns.id })
      .from(stressSigns)
      .orderBy(asc(stressSigns.sortOrder));
    const byStressSignId = new Map(
      params.analysis.stressSigns.map((sign) => [sign.stressSignId, sign]),
    );

    await tx.insert(plantReportStressSigns).values(
      seededSigns.map((sign) => {
        const result = byStressSignId.get(sign.id);
        const status: StressSignStatus = result?.status ?? 'unknown';
        const severity: StressSeverity =
          status === 'absent' ? 'none' : (result?.severity ?? 'none');

        return {
          plantReportId: report.id,
          stressSignId: sign.id,
          status,
          severity,
          confidence: clampConfidence(result?.confidence ?? null),
          notes: result?.notes ?? null,
        };
      }),
    );

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
      .from(stressSigns)
      .leftJoin(
        plantReportStressSigns,
        and(
          eq(plantReportStressSigns.stressSignId, stressSigns.id),
          eq(plantReportStressSigns.plantReportId, reportId),
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
      .orderBy(asc(stressSigns.sortOrder), asc(stressVariables.name)),
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

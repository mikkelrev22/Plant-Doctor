import { and, asc, desc, eq } from 'drizzle-orm';
import type {
  LlmPlantAnalysisResult,
  LlmRequestSummaryDto,
  PlantDto,
  PlantPhotoDto,
  PlantReportDetailDto,
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

  return Promise.all(
    rows.map(async (row) => {
      const [photo] = await db
        .select()
        .from(plantPhotos)
        .where(eq(plantPhotos.plantReportId, row.report.id))
        .orderBy(asc(plantPhotos.createdAt))
        .limit(1);

      return summaryFromRow({
        report: row.report,
        plant: row.plant,
        photo: photo ?? null,
      });
    }),
  );
}

export async function getReportDetail(
  db: Database,
  reportId: number,
): Promise<PlantReportDetailDto | null> {
  const [row] = await db
    .select({
      report: plantReports,
      plant: plants,
    })
    .from(plantReports)
    .innerJoin(plants, eq(plants.id, plantReports.plantId))
    .where(
      and(eq(plants.userId, RESEARCH_USER_ID), eq(plantReports.id, reportId)),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [photo] = await db
    .select()
    .from(plantPhotos)
    .where(eq(plantPhotos.plantReportId, reportId))
    .orderBy(asc(plantPhotos.createdAt))
    .limit(1);
  const [llmRequest] = await db
    .select()
    .from(llmRequests)
    .where(eq(llmRequests.plantReportId, reportId))
    .orderBy(desc(llmRequests.createdAt))
    .limit(1);
  const stressRows = await db
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
    .orderBy(asc(stressSigns.sortOrder), asc(stressVariables.name));

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
      photo: photo ?? null,
    }),
    stressSigns: [...stressSignsById.values()],
    llmRequest: llmRequest ? toLlmRequestSummary(llmRequest) : null,
  };
}

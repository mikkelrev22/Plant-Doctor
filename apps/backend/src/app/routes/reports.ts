import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { AnalyzeReportResponse } from '@plant-doctor/api-types';
import { reasoningEffortLevels } from '@plant-doctor/api-types';
import { config } from '../../config';
import '../types/fastify';
import {
  callPlantAnalysisLlm,
  parsePlantAnalysis,
} from '../services/llm.service';
import { buildPlantAnalysisPrompt } from '../services/prompts';
import {
  findOrCreatePlant,
  updatePlantName,
  updatePlantSpecies,
} from '../services/plants.service';
import {
  createLlmRequestLog,
  createReportFromAnalysis,
  getReportDetail,
  markLlmRequestFailed,
  markLlmRequestSucceeded,
} from '../services/reports.service';
import { listStressSigns } from '../services/stress.service';
import {
  storePlantPhoto,
  type StoredUpload,
} from '../services/uploads.service';
import { reportIdParams } from './schemas';
import {
  resolveCapturedAt,
  sanitizeCaptureDate,
} from '../services/capture-date.util';

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Returns a full report with photo, checklist, and LLM log summary.
  server.get(
    '/reports/:reportId',
    {
      schema: {
        params: reportIdParams,
      },
    },
    async function (request) {
      const { reportId } = request.params;

      const report = await getReportDetail(fastify.db, reportId);

      if (!report) {
        throw fastify.httpErrors.notFound('Report not found');
      }

      return report;
    },
  );

  // Uploads a plant image, asks the LLM for diagnosis, logs it, and stores a report.
  server.post('/reports/analyze', async function (request): Promise<AnalyzeReportResponse> {
    const fields: Record<string, string> = {};
    let upload: StoredUpload | null = null;

    for await (const part of request.parts()) {
      if (part.type === 'file' && part.fieldname === 'image') {
        upload = await storePlantPhoto(part);
      } else if (part.type === 'field') {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }

    if (!upload) {
      throw fastify.httpErrors.badRequest('A plant image is required');
    }

    const analyzeFieldsSchema = z.object({
      process: z
        .preprocess(
          (val) =>
            val === undefined ? undefined : val !== 'false' && val !== '0',
          z.boolean()
        )
        .default(true),
      plantId: z
        .preprocess(
          (val) => (val === undefined || val === '' ? undefined : Number(val)),
          z.number().int()
        )
        .optional(),
      plantName: z.string().optional(),
      // ISO 8601 capture time from the photo's EXIF (sent by the mobile client).
      // Validated/sanitized to a Date (or null) below via `resolveCapturedAt`.
      capturedAt: z.string().optional(),
      // Eval-only overrides for the LLM sampling knobs. Omitted by the normal
      // analyze flow; the LLM service falls back to 0.2 / 'none' when absent.
      temperature: z
        .preprocess(
          (val) => (val === undefined || val === '' ? undefined : Number(val)),
          z.number().min(0).max(2)
        )
        .optional(),
      reasoningEffort: z
        .enum(reasoningEffortLevels)
        .optional(),
    });

    const validatedFields = analyzeFieldsSchema.parse(fields);
    // Prefer the client-sent `capturedAt` (mobile app). Fall back to the EXIF
    // date parsed from the uploaded bytes (dashboard / raw uploads, which don't
    // send the field but preserve EXIF in the image). When neither is available
    // the report is dated `now()` by the column default.
    const capturedAt =
      resolveCapturedAt(validatedFields.capturedAt) ??
      sanitizeCaptureDate(upload.exifCapturedAt);

    // The plant lookup and the stress-sign checklist are independent, so run
    // them in parallel rather than back-to-back. The prompt needs both, and
    // createLlmRequestLog below needs plant.id, so it stays after.
    const [{ plant: initialPlant, created }, stressSigns] = await Promise.all([
      findOrCreatePlant(fastify.db, {
        plantId: validatedFields.plantId,
        plantName: validatedFields.plantName,
      }),
      listStressSigns(fastify.db),
    ]);
    let plant = initialPlant;
    const prompt = buildPlantAnalysisPrompt(stressSigns, plant.notes);
    const llmRequestId = await createLlmRequestLog(fastify.db, {
      plantId: plant.id,
      prompt,
      requestMetadata: {
        model: config.llmApiModel,
        providerBaseUrl: config.llmApiUrl,
        imageMimeType: upload.mimeType,
        storageKey: upload.storageKey,
        displayStorageKey: upload.display.storageKey,
        thumbnailStorageKey: upload.thumbnail.storageKey,
        temperature: validatedFields.temperature ?? 0.05,
        reasoningEffort: validatedFields.reasoningEffort ?? 'none',
      },
    });

    try {
      const llmResponse = await callPlantAnalysisLlm({
        prompt,
        image: {
          buffer: upload.display.buffer,
          mimeType: upload.display.mimeType,
        },
        temperature: validatedFields.temperature,
        reasoningEffort: validatedFields.reasoningEffort,
      });
      const analysis = parsePlantAnalysis(llmResponse.content, {
        // Constrain likelyStressors to the stress-variable vocabulary and
        // detectedRegions to the stress-sign vocabulary, so the model can't
        // invent free-text values outside the DB taxonomy.
        allowedStressorIds: new Set(
          stressSigns.flatMap((sign) =>
            sign.variables.map((variable) => variable.id),
          ),
        ),
        allowedStressSignIds: new Set(stressSigns.map((sign) => sign.id)),
      });

      // Only let the LLM rename plants we actually created in this request.
      // Reused plants (matched by name, or looked up by plantId) may have
      // prior report history and must not be silently renamed.
      if (created && analysis.identifiedPlantName) {
        try {
          plant = await updatePlantName(
            fastify.db,
            plant.id,
            analysis.identifiedPlantName,
          );
        } catch (error) {
          // If renaming fails (e.g. duplicate name), we just keep the current name.
          fastify.log.warn(
            `Could not rename plant ${plant.id} to ${analysis.identifiedPlantName}: ${error}`,
          );
        }
      }

      // The species is read-only, stable context — set it once, from the
      // first analysis that identifies the plant, and never overwrite it. This
      // applies to both newly created plants and existing ones whose species
      // is still null (e.g. plants created before this column existed).
      if (analysis.identifiedPlantName && plant.species === null) {
        try {
          plant = await updatePlantSpecies(
            fastify.db,
            plant.id,
            analysis.identifiedPlantName,
          );
        } catch (error) {
          fastify.log.warn(
            `Could not set species for plant ${plant.id}: ${error}`,
          );
        }
      }

      await markLlmRequestSucceeded(fastify.db, {
        llmRequestId,
        response: llmResponse.content,
        responseMetadata: llmResponse.responseMetadata,
        latencyMs: llmResponse.latencyMs,
      });

      const report = await createReportFromAnalysis(fastify.db, {
        plant,
        upload,
        analysis,
        llmRequestId,
        capturedAt,
      });

      return { plant, report };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Plant analysis failed';

      await markLlmRequestFailed(fastify.db, {
        llmRequestId,
        error: message,
      });

      // Log the full error for debugging; the client gets a generic message so
      // provider response bodies / internal details aren't leaked.
      request.log.error({ err: error, llmRequestId, plantId: plant.id }, message);
      throw fastify.httpErrors.badGateway('Plant analysis failed');
    }
  });
}

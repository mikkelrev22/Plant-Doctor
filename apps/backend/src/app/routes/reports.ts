import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { config } from '../../config';
import '../types/fastify';
import {
  callPlantAnalysisLlm,
  parsePlantAnalysis,
} from '../services/llm.service';
import { buildPlantAnalysisPrompt } from '../services/prompts';
import { findOrCreatePlant, updatePlantName } from '../services/plants.service';
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

export default async function (fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Returns a full report with photo, checklist, and LLM log summary.
  server.get(
    '/reports/:reportId',
    {
      schema: {
        params: z.object({
          reportId: z.coerce.number().int(),
        }),
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
  server.post('/reports/analyze', async function (request) {
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
    });

    const validatedFields = analyzeFieldsSchema.parse(fields);

    const { plant: initialPlant, created } = await findOrCreatePlant(
      fastify.db,
      {
        plantId: validatedFields.plantId,
        plantName: validatedFields.plantName,
      },
    );
    let plant = initialPlant;
    const stressSigns = await listStressSigns(fastify.db);
    const prompt = buildPlantAnalysisPrompt(stressSigns);
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
      },
    });

    try {
      const llmResponse = await callPlantAnalysisLlm({
        prompt,
        image: {
          buffer: upload.display.buffer,
          mimeType: upload.display.mimeType,
        },
      });
      const analysis = parsePlantAnalysis(llmResponse.content);

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

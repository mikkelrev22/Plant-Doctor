import { FastifyInstance } from 'fastify';
import { config } from '../../config';
import '../types/fastify';
import {
  callPlantAnalysisLlm,
  parsePlantAnalysis,
} from '../services/llm.service';
import { buildPlantAnalysisPrompt } from '../services/prompts';
import { findOrCreatePlant } from '../services/plants.service';
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

function optionalNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export default async function (fastify: FastifyInstance) {
  // Returns a full report with photo, checklist, and LLM log summary.
  fastify.get('/reports/:reportId', async function (request) {
    const params = request.params as { reportId?: string };
    const reportId = Number(params.reportId);

    if (!Number.isInteger(reportId)) {
      throw fastify.httpErrors.badRequest('Invalid report id');
    }

    const report = await getReportDetail(fastify.db, reportId);

    if (!report) {
      throw fastify.httpErrors.notFound('Report not found');
    }

    return report;
  });

  // Uploads a plant image, asks the LLM for diagnosis, logs it, and stores a report.
  fastify.post('/reports/analyze', async function (request) {
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

    const plant = await findOrCreatePlant(fastify.db, {
      plantId: optionalNumber(fields.plantId),
      plantName: fields.plantName,
    });
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
      },
    });

    try {
      const llmResponse = await callPlantAnalysisLlm({
        prompt,
        image: {
          buffer: upload.buffer,
          mimeType: upload.mimeType,
        },
      });
      const analysis = parsePlantAnalysis(llmResponse.content);

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

      throw fastify.httpErrors.badGateway(message);
    }
  });
}

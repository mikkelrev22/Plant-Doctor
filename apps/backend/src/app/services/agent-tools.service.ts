import sharp from 'sharp';
import type { AgentToolName } from '@plant-doctor/api-types';
import type { Chat, Database } from '@plant-doctor/db';
import { agentEvents } from '@plant-doctor/db/schema';
import { config } from '../../config';
import { NotFoundError } from '../errors';
import {
  formatPlantHistory,
  formatPlantReports,
  formatUserPlants,
} from './agent-format.service';
import { callLookAtPhotoLlm } from './llm.service';
import { getPlantForUser, listPlants } from './plants.service';
import {
  createLlmRequestLog,
  getReportDetail,
  listReportsForPlantExtended,
  markLlmRequestFailed,
  markLlmRequestSucceeded,
} from './reports.service';
import { storage } from './storage';
import {
  DISPLAY_JPEG_QUALITY,
  DISPLAY_MAX_DIMENSION,
} from './image-variants';

/** Cap on the `response_text` stored per agent event — keeps the log row bounded
 *  while preserving enough for debugging. */
const MAX_RESPONSE_TEXT = 10_000;

function truncate(text: string): string {
  return text.length > MAX_RESPONSE_TEXT
    ? `${text.slice(0, MAX_RESPONSE_TEXT)}…[truncated]`
    : text;
}

function errorMessage(err: unknown): string | undefined {
  if (err == null) return undefined;
  return err instanceof Error ? err.message : String(err);
}

/** Inserts one `agent_events` row per agent API call, for metrics/debugging.
 *  Exported so the chat-lifecycle routes (create/get/save) can log their calls
 *  with the same shape as the tool-use calls. */
export async function logAgentEvent(
  db: Database,
  params: {
    userId: number;
    chatId: number | null;
    tool: AgentToolName;
    requestParams: Record<string, unknown>;
    responseText?: string;
    latencyMs?: number;
    llmRequestId?: number | null;
    error?: string;
  },
): Promise<void> {
  await db.insert(agentEvents).values({
    userId: params.userId,
    chatId: params.chatId,
    tool: params.tool,
    requestParams: params.requestParams,
    responseText:
      params.responseText != null ? truncate(params.responseText) : null,
    latencyMs: params.latencyMs ?? null,
    llmRequestId: params.llmRequestId ?? null,
    error: params.error ?? null,
  });
}

/**
 * Runs a tool, then logs an `agent_events` row capturing the latency, the
 * (truncated) plain-text response, or the error — and re-throws the original
 * error so the route's error handler still maps it to the right status. Used by
 * the three read-only tools; `lookAtPhoto` logs its own event because it also
 * records the linked `llm_request_id`.
 */
async function withAgentEvent(
  db: Database,
  ctx: {
    chat: Chat;
    tool: AgentToolName;
    requestParams: Record<string, unknown>;
  },
  fn: () => Promise<string>,
): Promise<string> {
  const start = Date.now();
  let text: string | undefined;
  let thrown: unknown;
  try {
    text = await fn();
  } catch (err) {
    thrown = err;
  }
  await logAgentEvent(db, {
    userId: ctx.chat.userId,
    chatId: ctx.chat.id,
    tool: ctx.tool,
    requestParams: ctx.requestParams,
    responseText: text,
    latencyMs: Date.now() - start,
    error: errorMessage(thrown),
  });
  if (thrown) throw thrown;
  return text;
}

/** Resolve the plant a tool targets: the agent's explicit `plantId`, or the
 *  chat's default plant. Validates the plant belongs to the chat's user. */
async function resolvePlant(db: Database, chat: Chat, plantId?: number) {
  const id = plantId ?? chat.plantId;
  const plant = await getPlantForUser(db, id);
  if (!plant) {
    throw new NotFoundError('Plant not found');
  }
  return { id, plant };
}

/** `GET /agent/plantReports` — last 3 reports with full detail + "N more" note. */
export function agentPlantReports(
  db: Database,
  chat: Chat,
  plantId?: number,
): Promise<string> {
  return withAgentEvent(
    db,
    { chat, tool: 'plantReports', requestParams: { plantId: plantId ?? null } },
    async () => {
      const { id } = await resolvePlant(db, chat, plantId);
      const reports = await listReportsForPlantExtended(db, id);
      return formatPlantReports(reports);
    },
  );
}

/** `GET /agent/plantHistory` — every report, brief (dates, summary, signs w/o notes). */
export function agentPlantHistory(
  db: Database,
  chat: Chat,
  plantId?: number,
): Promise<string> {
  return withAgentEvent(
    db,
    { chat, tool: 'plantHistory', requestParams: { plantId: plantId ?? null } },
    async () => {
      const { id } = await resolvePlant(db, chat, plantId);
      const reports = await listReportsForPlantExtended(db, id);
      return formatPlantHistory(reports);
    },
  );
}

/** `GET /agent/userPlants` — the user's plants (capped at 10). */
export function agentUserPlants(db: Database, chat: Chat): Promise<string> {
  return withAgentEvent(
    db,
    { chat, tool: 'userPlants', requestParams: {} },
    async () => {
      const all = await listPlants(db);
      return formatUserPlants(all.slice(0, 10));
    },
  );
}

/**
 * `POST /agent/lookAtPhoto` — answers a free-text question about a report's
 * photo using the vision LLM. Loads the report's photo, downscaling the stored
 * original to the same 1024px display variant the analysis call sees, asks the
 * LLM, and logs both an `llm_requests` row (action `agent_look_at_photo`) and an
 * `agent_events` row linking to it. On LLM failure the request is marked failed
 * and the error is re-thrown for the route to map to 502 Bad Gateway.
 */
export async function agentLookAtPhoto(
  db: Database,
  chat: Chat,
  params: { reportId?: number; query: string },
): Promise<string> {
  const reportId = params.reportId ?? chat.defaultReportId;
  if (reportId == null) {
    throw new NotFoundError('No report available for this chat');
  }

  const requestParams = { reportId, query: params.query };
  const start = Date.now();
  let llmRequestId: number | undefined;
  let text: string | undefined;
  let thrown: unknown;

  try {
    const report = await getReportDetail(db, reportId);
    if (!report) throw new NotFoundError('Report not found');
    if (!report.photo) throw new NotFoundError('No photo attached to this report');
    const photo = report.photo;
    if (!photo.storageKey) {
      throw new NotFoundError('Photo has no stored original to load');
    }

    // Load the stored original and downscale to the 1024px display variant —
    // the same size/quality the analysis call sees — so lookAtPhoto answers
    // from a comparable image without needing a persisted display key.
    const { buffer: original } = await storage.getObject(photo.storageKey);
    const displayBuffer = await sharp(original, { failOn: 'none' })
      .rotate()
      .resize({
        fit: 'inside',
        width: DISPLAY_MAX_DIMENSION,
        height: DISPLAY_MAX_DIMENSION,
        withoutEnlargement: true,
      })
      .jpeg({ quality: DISPLAY_JPEG_QUALITY, progressive: true, force: true })
      .toBuffer();

    const presentSigns = report.stressSigns
      .filter((s) => s.status === 'present')
      .map((s) => `${s.name} (${s.severity})`)
      .join(', ');
    const contextLines = [
      `Plant: ${report.plantName}`,
      `Report date: ${report.reportedAt.slice(0, 10)}`,
      `Summary: ${report.summary}`,
      ...(presentSigns ? [`Present stress signs: ${presentSigns}`] : []),
    ];
    const prompt = `${contextLines.join(
      '\n',
    )}\n\nQuestion from the user about this photo: ${params.query}`;

    llmRequestId = await createLlmRequestLog(db, {
      plantId: report.plantId,
      prompt,
      requestMetadata: { action: 'agent_look_at_photo', model: config.llmApiModel },
      action: 'agent_look_at_photo',
    });

    const result = await callLookAtPhotoLlm({
      prompt,
      image: { buffer: displayBuffer, mimeType: 'image/jpeg' },
    });
    await markLlmRequestSucceeded(db, {
      llmRequestId,
      response: result.content,
      responseMetadata: result.responseMetadata,
      latencyMs: result.latencyMs,
    });
    text = result.content;
  } catch (err) {
    thrown = err;
    if (llmRequestId) {
      await markLlmRequestFailed(db, {
        llmRequestId,
        error: errorMessage(err) ?? 'Unknown error',
      });
    }
  }

  await logAgentEvent(db, {
    userId: chat.userId,
    chatId: chat.id,
    tool: 'lookAtPhoto',
    requestParams,
    responseText: text,
    latencyMs: Date.now() - start,
    llmRequestId: llmRequestId ?? null,
    error: errorMessage(thrown),
  });

  if (thrown) throw thrown;
  return text as string;
}
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { ChatHistoryDto, CreateChatResponseDto } from '@plant-doctor/api-types';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import type { Chat, Database } from '@plant-doctor/db';
import { chats, plantReports, plants } from '@plant-doctor/db/schema';
import { NotFoundError } from '../errors';
import { getPlantForUser } from './plants.service';
import { getReportDetail } from './reports.service';
import { formatLatestReportContext } from './agent-format.service';

/**
 * Creates a new agent chat bound to a plant. Validates the plant belongs to the
 * Research User, captures the plant's latest report as the default context
 * (nullable when the plant has no reports yet), generates an opaque chat token,
 * and returns the token plus a plain-text summary of the plant + latest report
 * for the agent to start the session with.
 */
export async function createChat(
  db: Database,
  params: { plantId: number },
): Promise<CreateChatResponseDto> {
  const plant = await getPlantForUser(db, params.plantId);
  if (!plant) {
    throw new NotFoundError('Plant not found');
  }

  // Latest report id for the plant — newest by reported_at. Uses the
  // `plant_reports_plant_reported_at_idx` index.
  const [latestReport] = await db
    .select({ id: plantReports.id })
    .from(plantReports)
    .where(eq(plantReports.plantId, params.plantId))
    .orderBy(desc(plantReports.reportedAt))
    .limit(1);

  const defaultReportId = latestReport?.id ?? null;

  // Reuse the full report assembler for the latest report so the context text
  // mirrors what the dashboard sees (stress signs, identification, etc.).
  const report = defaultReportId
    ? await getReportDetail(db, defaultReportId)
    : null;

  const chatToken = randomUUID();
  await db.insert(chats).values({
    chatToken,
    userId: RESEARCH_USER_ID,
    plantId: params.plantId,
    defaultReportId,
    history: null,
  });

  return {
    chatToken,
    contextText: formatLatestReportContext(plant, report),
    plantId: plant.id,
    plantName: plant.name,
    defaultReportId,
  };
}

/** Loads a chat by its opaque token, scoped to the Research User. Used by the
 *  agent auth preHandler to validate the token and scope subsequent queries. */
export async function getChatByToken(
  db: Database,
  chatToken: string,
): Promise<Chat | null> {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.chatToken, chatToken), eq(chats.userId, RESEARCH_USER_ID)))
    .limit(1);
  return chat ?? null;
}

/** `GET /agent/chats/:chatToken` — the saved history blob for resuming. */
export async function getChat(
  db: Database,
  chatToken: string,
): Promise<ChatHistoryDto | null> {
  const [row] = await db
    .select({ chat: chats, plantName: plants.name })
    .from(chats)
    .innerJoin(plants, eq(plants.id, chats.plantId))
    .where(and(eq(chats.chatToken, chatToken), eq(chats.userId, RESEARCH_USER_ID)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    chatToken: row.chat.chatToken,
    plantId: row.chat.plantId,
    plantName: row.plantName,
    defaultReportId: row.chat.defaultReportId,
    history: row.chat.history ?? null,
    createdAt: row.chat.createdAt.toISOString(),
    updatedAt: row.chat.updatedAt.toISOString(),
  };
}

/** `PUT /agent/chats/:chatToken` — overwrites the conversation JSON blob. */
export async function saveChat(
  db: Database,
  params: { chatToken: string; history: unknown },
): Promise<void> {
  const updated = await db
    .update(chats)
    .set({ history: params.history, updatedAt: new Date() })
    .where(and(eq(chats.chatToken, params.chatToken), eq(chats.userId, RESEARCH_USER_ID)))
    .returning({ id: chats.id });

  if (updated.length === 0) {
    throw new NotFoundError('Chat not found');
  }
}
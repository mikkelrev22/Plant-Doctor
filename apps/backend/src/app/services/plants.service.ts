import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { PlantDto, PlantListItemDto } from '@plant-doctor/api-types';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import type { Database } from '@plant-doctor/db';
import { plantPhotos, plantReports, plants } from '@plant-doctor/db/schema';
import { NotFoundError } from '../errors';
import { generatePlantName } from './plant-names';

function toPlantDto(plant: typeof plants.$inferSelect): PlantDto {
  return {
    id: plant.id,
    name: plant.name,
    notes: plant.notes,
    createdAt: plant.createdAt.toISOString(),
    updatedAt: plant.updatedAt.toISOString(),
  };
}

export async function listPlants(db: Database): Promise<PlantListItemDto[]> {
  const plantRows = await db
    .select()
    .from(plants)
    .where(eq(plants.userId, RESEARCH_USER_ID))
    .orderBy(desc(plants.id));

  const reportCounts = await db
    .select({ plantId: plantReports.plantId, count: count() })
    .from(plantReports)
    .groupBy(plantReports.plantId);

  const latestPhotos = (await db.execute(sql`
    SELECT DISTINCT ON (${plantReports.plantId})
      ${plantReports.plantId} AS "plantId",
      ${plantPhotos.thumbnailUrl} AS "thumbnailUrl"
    FROM ${plantReports}
    LEFT JOIN ${plantPhotos} ON ${plantPhotos.plantReportId} = ${plantReports.id}
    WHERE ${plantPhotos.thumbnailUrl} IS NOT NULL
    ORDER BY ${plantReports.plantId}, ${plantReports.reportedAt} DESC
  `)) as Array<{ plantId: number; thumbnailUrl: string }>;

  const countByPlantId = new Map(
    reportCounts.map((row) => [row.plantId, row.count]),
  );
  const thumbnailByPlantId = new Map(
    latestPhotos.map((row) => [row.plantId, row.thumbnailUrl]),
  );

  return plantRows.map((plant) => ({
    ...toPlantDto(plant),
    thumbnailUrl: thumbnailByPlantId.get(plant.id) ?? null,
    reportCount: countByPlantId.get(plant.id) ?? 0,
  }));
}

/**
 * Inserts a plant for the Research User with the given (or generated) name,
 * atomically deduplicating against the `plants_user_name_idx` unique index.
 *
 * Returns the plant along with `created`, so callers can tell apart "we just
 * created this plant" from "we reused an existing one" — e.g. to decide
 * whether the LLM is allowed to rename it.
 *
 * Using `onConflictDoNothing` (rather than a SELECT-then-INSERT) avoids the
 * TOCTOU race where two concurrent requests both pass the existence check and
 * one then fails with a unique-violation.
 */
async function upsertPlantByName(
  db: Database,
  name?: string,
): Promise<{ plant: PlantDto; created: boolean }> {
  const trimmedName = name?.trim() || generatePlantName();

  const [inserted] = await db
    .insert(plants)
    .values({ userId: RESEARCH_USER_ID, name: trimmedName })
    .onConflictDoNothing({ target: [plants.userId, plants.name] })
    .returning();

  if (inserted) {
    return { plant: toPlantDto(inserted), created: true };
  }

  // Conflict — the plant already exists. Fetch it to return the full row.
  const [existing] = await db
    .select()
    .from(plants)
    .where(
      and(eq(plants.userId, RESEARCH_USER_ID), eq(plants.name, trimmedName)),
    )
    .limit(1);

  if (!existing) {
    // Should be unreachable given the unique constraint, but don't silently
    // return null.
    throw new Error('Unable to resolve plant after name conflict');
  }

  return { plant: toPlantDto(existing), created: false };
}

export async function createPlant(
  db: Database,
  name?: string,
): Promise<PlantDto> {
  return (await upsertPlantByName(db, name)).plant;
}

export async function getPlantForUser(
  db: Database,
  plantId: number,
): Promise<PlantDto | null> {
  const [plant] = await db
    .select()
    .from(plants)
    .where(and(eq(plants.userId, RESEARCH_USER_ID), eq(plants.id, plantId)))
    .limit(1);

  return plant ? toPlantDto(plant) : null;
}

export async function findOrCreatePlant(
  db: Database,
  params: { plantId?: number; plantName?: string },
): Promise<{ plant: PlantDto; created: boolean }> {
  if (params.plantId) {
    const plant = await getPlantForUser(db, params.plantId);

    if (!plant) {
      throw new NotFoundError('Plant not found');
    }

    return { plant, created: false };
  }

  return upsertPlantByName(db, params.plantName);
}

export async function updatePlantName(
  db: Database,
  plantId: number,
  name: string,
): Promise<PlantDto> {
  const [updated] = await db
    .update(plants)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(plants.userId, RESEARCH_USER_ID), eq(plants.id, plantId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Plant not found');
  }

  return toPlantDto(updated);
}

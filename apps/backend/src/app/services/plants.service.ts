import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { PlantDto, PlantListItemDto } from '@plant-doctor/api-types';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import type { Database } from '@plant-doctor/db';
import { plantPhotos, plantReports, plants } from '@plant-doctor/db/schema';
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

export async function createPlant(
  db: Database,
  name?: string,
): Promise<PlantDto> {
  const trimmedName = name?.trim() || generatePlantName();

  const [existing] = await db
    .select()
    .from(plants)
    .where(
      and(eq(plants.userId, RESEARCH_USER_ID), eq(plants.name, trimmedName)),
    )
    .limit(1);

  if (existing) {
    return toPlantDto(existing);
  }

  const [created] = await db
    .insert(plants)
    .values({
      userId: RESEARCH_USER_ID,
      name: trimmedName,
    })
    .returning();

  return toPlantDto(created);
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
): Promise<PlantDto> {
  if (params.plantId) {
    const plant = await getPlantForUser(db, params.plantId);

    if (!plant) {
      throw new Error('Plant not found');
    }

    return plant;
  }

  return createPlant(db, params.plantName);
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
    throw new Error('Plant not found');
  }

  return toPlantDto(updated);
}

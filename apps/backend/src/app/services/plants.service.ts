import { and, asc, eq } from 'drizzle-orm';
import type { PlantDto } from '@plant-doctor/api-types';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import type { Database } from '@plant-doctor/db';
import { plants } from '@plant-doctor/db/schema';
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

export async function listPlants(db: Database): Promise<PlantDto[]> {
  const rows = await db
    .select()
    .from(plants)
    .where(eq(plants.userId, RESEARCH_USER_ID))
    .orderBy(asc(plants.name));

  return rows.map(toPlantDto);
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

import { and, count, desc, eq, isNotNull, sql, asc, inArray } from 'drizzle-orm';
import type {
  PlantDto,
  PlantListItemDto,
  PlantListItemEvalDto,
  PlantListItemStressSignDto,
} from '@plant-doctor/api-types';
import { RESEARCH_USER_ID } from '@plant-doctor/api-types';
import type { Database } from '@plant-doctor/db';
import {
  llmRequests,
  plantPhotos,
  plantReports,
  plants,
  plantReportStressSigns,
  stressSigns,
} from '@plant-doctor/db/schema';
import { NotFoundError } from '../errors';
import { generatePlantName } from './plant-names';
import { toStressSeverity, toStressSignStatus } from './stress-signs.util';

function toPlantDto(plant: typeof plants.$inferSelect): PlantDto {
  return {
    id: plant.id,
    name: plant.name,
    species: plant.species,
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

  // Latest report id per plant — mirrors the thumbnail query's `DISTINCT ON`
  // shape, reusing the `plant_reports_plant_reported_at_idx` index. Only plants
  // with at least one report produce a row here.
  const latestReports = (await db.execute(sql`
    SELECT DISTINCT ON (${plantReports.plantId})
      ${plantReports.plantId} AS "plantId",
      ${plantReports.id} AS "reportId"
    FROM ${plantReports}
    ORDER BY ${plantReports.plantId}, ${plantReports.reportedAt} DESC
  `)) as Array<{ plantId: number; reportId: number }>;

  // Present stress signs for those latest reports — a single batched query
  // (no N+1), filtered to status='present' so the list payload stays small and
  // ordered by the sign's definition sort order for stable dot rendering.
  const latestReportIds = latestReports.map((r) => r.reportId);
  const presentSignRows = latestReportIds.length
    ? await db
        .select({
          reportId: plantReportStressSigns.plantReportId,
          stressSignId: stressSigns.id,
          name: stressSigns.name,
          status: plantReportStressSigns.status,
          severity: plantReportStressSigns.severity,
        })
        .from(plantReportStressSigns)
        .innerJoin(
          stressSigns,
          eq(stressSigns.id, plantReportStressSigns.stressSignId),
        )
        .where(
          and(
            inArray(plantReportStressSigns.plantReportId, latestReportIds),
            eq(plantReportStressSigns.status, 'present'),
          ),
        )
        .orderBy(asc(stressSigns.sortOrder))
    : [];

  const countByPlantId = new Map(
    reportCounts.map((row) => [row.plantId, row.count]),
  );
  const thumbnailByPlantId = new Map(
    latestPhotos.map((row) => [row.plantId, row.thumbnailUrl]),
  );

  // Group present signs by report id, then resolve to plant id via the
  // latestReports map (plantId -> reportId).
  const signsByReportId = new Map<number, PlantListItemStressSignDto[]>();
  for (const row of presentSignRows) {
    const list = signsByReportId.get(row.reportId) ?? [];
    list.push({
      stressSignId: row.stressSignId,
      name: row.name,
      status: toStressSignStatus(row.status),
      severity: toStressSeverity(row.severity),
    });
    signsByReportId.set(row.reportId, list);
  }
  const reportIdByPlantId = new Map(
    latestReports.map((r) => [r.plantId, r.reportId]),
  );
  const signsByPlantId = new Map<number, PlantListItemStressSignDto[]>();
  for (const [plantId, reportId] of reportIdByPlantId) {
    signsByPlantId.set(plantId, signsByReportId.get(reportId) ?? []);
  }

  return plantRows.map((plant) => ({
    ...toPlantDto(plant),
    thumbnailUrl: thumbnailByPlantId.get(plant.id) ?? null,
    reportCount: countByPlantId.get(plant.id) ?? 0,
    latestReportStressSigns: signsByPlantId.get(plant.id) ?? [],
  }));
}

/**
 * Like `listPlants`, but also returns the distinct LLM model names used across
 * each plant's reports (latest first). Powers the eval tool's "Past eval
 * tables" list, where runs against different models need to be told apart.
 *
 * Served by a dedicated GET /plants/evals route so it can be gated/disabled in
 * production independently of the general plant list — it joins `llm_requests`,
 * which is internal telemetry not exposed by GET /plants.
 */
export async function listPlantsForEval(
  db: Database,
): Promise<PlantListItemEvalDto[]> {
  // Reuse the base plant list (plants + thumbnail + reportCount + latest-report
  // stress-sign dots) and augment it with the one eval-specific field. Sharing
  // `listPlants` keeps both list endpoints consistent (same dots, same counts)
  // and avoids duplicating the plant / report-count / thumbnail queries here.
  const items = await listPlants(db);

  // Distinct model names per plant, ordered by most-recent report first within
  // each plant. We pull every (plantId, model, reportedAt) row and dedupe in
  // memory — the set is small (one row per report) and this avoids a
  // correlated/distinct aggregate that Drizzle expresses awkwardly.
  const modelRows = await db
    .select({
      plantId: plantReports.plantId,
      model: llmRequests.model,
      reportedAt: plantReports.reportedAt,
    })
    .from(plantReports)
    .innerJoin(
      llmRequests,
      and(
        eq(llmRequests.plantReportId, plantReports.id),
        isNotNull(llmRequests.model),
      ),
    )
    .orderBy(desc(plantReports.reportedAt));

  const modelsByPlantId = new Map<number, string[]>();
  const seenByPlantId = new Map<number, Set<string>>();
  for (const row of modelRows) {
    const seen = seenByPlantId.get(row.plantId) ?? new Set<string>();
    if (!seen.has(row.model)) {
      seen.add(row.model);
      modelsByPlantId.set(
        row.plantId,
        [...(modelsByPlantId.get(row.plantId) ?? []), row.model],
      );
    }
    seenByPlantId.set(row.plantId, seen);
  }

  return items.map((plant) => ({
    ...plant,
    models: modelsByPlantId.get(plant.id) ?? [],
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

/** Max length of stored plant notes, in characters. Bounds the surface that
 * notes contribute to the analysis prompt (prompt-injection defense-in-depth). */
const MAX_PLANT_NOTES_LENGTH = 1000;

/**
 * Normalizes user-supplied notes for storage: trims, strips control characters
 * (keeps newlines/tabs), caps length, and returns `null` when blank. Stripping
 * control chars drops zero-width / null-byte injection tricks at the source.
 */
function normalizeNotes(value: string): string | null {
  const stripped = value
    // eslint-disable-next-line no-control-regex -- control chars are the point: strip them (except \n \t) as prompt-injection defense
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  const capped = stripped.slice(0, MAX_PLANT_NOTES_LENGTH).trim();
  return capped.length > 0 ? capped : null;
}

/**
 * Updates the user-editable plant fields (`name` and/or `notes`). Only the
 * provided keys are written. Notes are sanitized (control chars stripped,
 * length capped, blank → null) so the column stays a clean `string | null` and
 * the analyze-prompt guard is a simple truthy check. `name` must already be
 * non-empty (validated by the route).
 */
export async function updatePlant(
  db: Database,
  plantId: number,
  fields: { name?: string; notes?: string | null },
): Promise<PlantDto> {
  const set: Partial<typeof plants.$inferInsert> = { updatedAt: new Date() };
  if (fields.name !== undefined) {
    set.name = fields.name;
  }
  if (fields.notes !== undefined) {
    set.notes = normalizeNotes(fields.notes ?? '');
  }

  const [updated] = await db
    .update(plants)
    .set(set)
    .where(and(eq(plants.userId, RESEARCH_USER_ID), eq(plants.id, plantId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Plant not found');
  }

  return toPlantDto(updated);
}

/**
 * Sets the plant's read-only `species`. Unlike `name`, `species` is server-owned
 * (derived from the LLM identification) and not user-editable, so there is no
 * route that accepts it. Callers are expected to only set it when the column is
 * currently null — the species is stable context that sticks after the first
 * successful identification.
 */
export async function updatePlantSpecies(
  db: Database,
  plantId: number,
  species: string,
): Promise<PlantDto> {
  const [updated] = await db
    .update(plants)
    .set({ species, updatedAt: new Date() })
    .where(and(eq(plants.userId, RESEARCH_USER_ID), eq(plants.id, plantId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Plant not found');
  }

  return toPlantDto(updated);
}

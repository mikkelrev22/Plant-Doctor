import { asc, eq } from 'drizzle-orm';
import type { StressSignDto } from '@plant-doctor/api-types';
import type { Database } from '@plant-doctor/db';
import {
  stressSigns,
  stressSignVariables,
  stressVariables,
} from '@plant-doctor/db/schema';

export async function listStressSigns(db: Database): Promise<StressSignDto[]> {
  const rows = await db
    .select({
      id: stressSigns.id,
      name: stressSigns.name,
      sortOrder: stressSigns.sortOrder,
      variableId: stressVariables.id,
      variableName: stressVariables.name,
    })
    .from(stressSigns)
    .leftJoin(
      stressSignVariables,
      eq(stressSignVariables.stressSignId, stressSigns.id),
    )
    .leftJoin(
      stressVariables,
      eq(stressVariables.id, stressSignVariables.stressVariableId),
    )
    .orderBy(asc(stressSigns.sortOrder), asc(stressVariables.name));

  const byId = new Map<string, StressSignDto>();

  for (const row of rows) {
    const stressSign =
      byId.get(row.id) ??
      ({
        id: row.id,
        name: row.name,
        sortOrder: row.sortOrder,
        variables: [],
      } satisfies StressSignDto);

    if (row.variableId && row.variableName) {
      stressSign.variables.push({
        id: row.variableId,
        name: row.variableName,
      });
    }

    byId.set(row.id, stressSign);
  }

  return [...byId.values()];
}

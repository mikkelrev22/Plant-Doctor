import type { Database } from '@plant-doctor/db';
import { listPlants } from './plants.service';

/**
 * Service-level unit tests for `listPlants`'s stress-sign assembly — the new
 * logic that groups a plant's latest-report present stress signs and resolves
 * them onto `PlantListItemDto.latestReportStressSigns`.
 *
 * The DB is mocked with a chainable thenable so the exact query shapes (FROM,
 * WHERE, ORDER BY, JOIN) are ignored — we only verify the in-memory grouping,
 * report→plant resolution, and default-empty behaviour. The `status='present'`
 * SQL filter is mimicked by the canned rows (absent/unknown are simply not
 * returned), matching what the real query produces.
 */

/** A chainable thenable: every builder method returns `this`, and `await`
 *  resolves to the configured value. Mirrors how the service awaits the final
 *  builder (`await db.select(...).from(...).where(...).orderBy(...)`). */
class Chain<T> {
  constructor(private value: T) {}

  from = () => this;
  where = () => this;
  groupBy = () => this;
  orderBy = () => this;
  innerJoin = () => this;

  then<U>(onFulfilled: (v: T) => U | PromiseLike<U>): PromiseLike<U> {
    return Promise.resolve(this.value).then(onFulfilled) as unknown as PromiseLike<U>;
  }
}

function makeDb(selectResults: unknown[], executeResults: unknown[]) {
  return {
    select: () => new Chain(selectResults.shift()),
    execute: () => Promise.resolve(executeResults.shift()),
  } as unknown as Database;
}

describe('listPlants — latestReportStressSigns', () => {
  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  it('groups present signs by their latest report and resolves them to the plant', async () => {
    const plants = [
      { id: 1, name: 'Aloe', species: 'Aloe vera', notes: null, createdAt: baseDate, updatedAt: baseDate },
      { id: 2, name: 'Pothos', species: null, notes: null, createdAt: baseDate, updatedAt: baseDate },
      // Plant 3 has no reports at all.
      { id: 3, name: 'Cactus', species: null, notes: null, createdAt: baseDate, updatedAt: baseDate },
    ];

    const db = makeDb(
      [
        // 1) plantRows (select().from(plants).where().orderBy())
        plants,
        // 2) reportCounts (select({plantId,count}).from(plantReports).groupBy())
        [{ plantId: 1, count: 2 }, { plantId: 2, count: 1 }],
        // 3) presentSignRows (select({...}).from().innerJoin().where().orderBy())
        [
          { reportId: 10, stressSignId: 'leaf_yellowing_chlorosis', name: 'Leaf yellowing (chlorosis)', status: 'present', severity: 'mild' },
          { reportId: 10, stressSignId: 'wilting_drooping', name: 'Wilting / drooping', status: 'present', severity: 'severe' },
          { reportId: 20, stressSignId: 'brown_crispy_tips_edges', name: 'Brown / crispy tips & edges', status: 'present', severity: 'moderate' },
        ],
      ],
      [
        // 1) latestPhotos (execute)
        [{ plantId: 1, thumbnailUrl: 'http://x/1.jpg' }],
        // 2) latestReports (execute) — latest report id per plant
        [{ plantId: 1, reportId: 10 }, { plantId: 2, reportId: 20 }],
      ],
    );

    const result = await listPlants(db);

    expect(result).toHaveLength(3);

    // Plant 1 — latest report 10 has two present signs.
    expect(result[0].id).toBe(1);
    expect(result[0].thumbnailUrl).toBe('http://x/1.jpg');
    expect(result[0].reportCount).toBe(2);
    expect(result[0].latestReportStressSigns).toEqual([
      { stressSignId: 'leaf_yellowing_chlorosis', name: 'Leaf yellowing (chlorosis)', status: 'present', severity: 'mild' },
      { stressSignId: 'wilting_drooping', name: 'Wilting / drooping', status: 'present', severity: 'severe' },
    ]);

    // Plant 2 — latest report 20 has one present sign; no thumbnail.
    expect(result[1].id).toBe(2);
    expect(result[1].thumbnailUrl).toBeNull();
    expect(result[1].reportCount).toBe(1);
    expect(result[1].latestReportStressSigns).toEqual([
      { stressSignId: 'brown_crispy_tips_edges', name: 'Brown / crispy tips & edges', status: 'present', severity: 'moderate' },
    ]);

    // Plant 3 — no reports: empty dots, zero count, no thumbnail.
    expect(result[2].id).toBe(3);
    expect(result[2].thumbnailUrl).toBeNull();
    expect(result[2].reportCount).toBe(0);
    expect(result[2].latestReportStressSigns).toEqual([]);
  });

  it('defaults latestReportStressSigns to [] when the latest report has no present signs', async () => {
    const plants = [
      { id: 1, name: 'Aloe', species: null, notes: null, createdAt: baseDate, updatedAt: baseDate },
    ];

    const db = makeDb(
      [
        plants,
        [{ plantId: 1, count: 1 }],
        // No present rows returned for the latest report (SQL status='present' filter yields nothing).
        [],
      ],
      [
        [], // no thumbnails
        [{ plantId: 1, reportId: 99 }],
      ],
    );

    const result = await listPlants(db);
    expect(result[0].latestReportStressSigns).toEqual([]);
  });
});
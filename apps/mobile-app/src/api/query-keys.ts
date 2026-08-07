/**
 * Centralised React Query key factory. Keeping keys in one place avoids
 * cache-miss bugs from inconsistent key shapes and is trivially unit-testable.
 */
export const qk = {
  /** GET / — backend health/version probe. */
  health: ['health'] as const,
  plants: ['plants'] as const,
  plant: (id: number) => ['plants', id] as const,
  /** Extended report history (with per-report stress signs). Nested under the
   *  per-plant `['plants', plantId, 'reports']` path so invalidating the plant
   *  (or its reports path) also covers it. */
  reportsExtended: (plantId: number) =>
    ['plants', plantId, 'reports', 'extended'] as const,
  report: (id: number) => ['reports', id] as const,
} as const;
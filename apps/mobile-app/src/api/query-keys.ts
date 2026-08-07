/**
 * Centralised React Query key factory. Keeping keys in one place avoids
 * cache-miss bugs from inconsistent key shapes and is trivially unit-testable.
 */
export const qk = {
  plants: ['plants'] as const,
  plant: (id: number) => ['plants', id] as const,
  reports: (plantId: number) => ['plants', plantId, 'reports'] as const,
  /** Extended report history (with per-report stress signs). A descendent of
   *  `reports(plantId)` so invalidating the reports list also covers it. */
  reportsExtended: (plantId: number) =>
    ['plants', plantId, 'reports', 'extended'] as const,
  report: (id: number) => ['reports', id] as const,
} as const;
/**
 * Centralised React Query key factory. Keeping keys in one place avoids
 * cache-miss bugs from inconsistent key shapes and is trivially unit-testable.
 */
export const qk = {
  plants: ['plants'] as const,
  plant: (id: number) => ['plants', id] as const,
  reports: (plantId: number) => ['plants', plantId, 'reports'] as const,
  report: (id: number) => ['reports', id] as const,
} as const;
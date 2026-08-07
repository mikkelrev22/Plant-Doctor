import { describe, expect, it } from 'vitest';
import { qk } from './query-keys';

describe('query keys', () => {
  it('exposes a stable plants list key', () => {
    expect(qk.plants).toEqual(['plants']);
  });

  it('scopes plant/reports/report keys by id', () => {
    expect(qk.plant(7)).toEqual(['plants', 7]);
    expect(qk.reports(7)).toEqual(['plants', 7, 'reports']);
    expect(qk.reportsExtended(7)).toEqual(['plants', 7, 'reports', 'extended']);
    expect(qk.report(42)).toEqual(['reports', 42]);
  });

  it('nests reportsExtended under reports so list invalidation covers it', () => {
    expect(qk.reportsExtended(7).slice(0, 3)).toEqual(qk.reports(7));
  });

  it('shares a prefix so invalidating plants also covers reports', () => {
    // qk.reports(7) is a descendent of qk.plants, but not of qk.plant — the list
    // and per-plant caches are independent, which is the intended invalidation
    // shape used by the hooks.
    expect(qk.reports(7).slice(0, 1)).toEqual(qk.plants.slice(0, 1));
  });
});
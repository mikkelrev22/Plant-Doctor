import { describe, expect, it } from 'vitest';
import { qk } from './query-keys';

describe('query keys', () => {
  it('exposes stable health and plants list keys', () => {
    expect(qk.health).toEqual(['health']);
    expect(qk.plants).toEqual(['plants']);
  });

  it('scopes plant/reports/report keys by id', () => {
    expect(qk.plant(7)).toEqual(['plants', 7]);
    expect(qk.reportsExtended(7)).toEqual(['plants', 7, 'reports', 'extended']);
    expect(qk.report(42)).toEqual(['reports', 42]);
  });

  it('nests reportsExtended under the per-plant reports path', () => {
    expect(qk.reportsExtended(7).slice(0, 3)).toEqual(['plants', 7, 'reports']);
  });

  it('nests reportsExtended under plants so plant-list invalidation covers it', () => {
    // reportsExtended(7) is a descendent of qk.plants, but not of qk.plant — the
    // list and per-plant caches are independent, which is the intended
    // invalidation shape used by the hooks.
    expect(qk.reportsExtended(7).slice(0, 1)).toEqual(qk.plants.slice(0, 1));
  });
});
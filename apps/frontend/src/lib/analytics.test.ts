import { describe, expect, it } from 'vitest';
import type { Dive } from './dives';
import { activityByMonth, depthDistribution, divesByGas, divesByTag, durationDistribution } from './analytics';

const dive = (over: Partial<Dive> = {}): Dive => ({
  id: 1, datetime: '2026-02-10T09:00:00', location: 'Cove', depth: 18, duration: 42, lat: 0, lng: 0, ...over,
});

describe('analytics aggregation', () => {
  it('groups monthly activity with drill-down date filters', () => {
    const result = activityByMonth([dive(), dive({ id: 2, datetime: '2026-02-20T10:00:00', duration: 50 })]);
    expect(result).toEqual([expect.objectContaining({ count: 2, bottomTime: 92, filters: { startDate: '2026-02-01', endDate: '2026-02-28' } })]);
  });

  it('creates depth and duration histogram filters', () => {
    expect(depthDistribution([dive({ depth: 18 })], 'meters')[0]).toMatchObject({ label: '10–<20m', filters: { minDepth: '10', maxDepth: '19.99' } });
    expect(durationDistribution([dive({ duration: 42 })])[0]).toMatchObject({ label: '30–<45 min', filters: { minDuration: '30', maxDuration: '44.99' } });
  });

  it('counts a tag or gas once per dive', () => {
    const tank = { size: 12, working_pressure: 232, start_pressure: 200, end_pressure: 50, gas_mix: { oxygen: 32, name: 'EANx32' } };
    const input = dive({ tags: ['wreck', 'wreck'], equipment: { tanks: [tank, tank] } });
    expect(divesByTag([input])[0].count).toBe(1);
    expect(divesByGas([input])[0].count).toBe(1);
  });
});

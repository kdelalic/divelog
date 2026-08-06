import { describe, expect, it } from 'vitest';
import {
  calculateDiveStatistics,
  formatDuration,
  getDivesByMonth,
  getRecentDives,
} from './diveStats';
import type { Dive } from './dives';

const dive = (over: Partial<Dive> = {}): Dive => ({
  id: 1,
  datetime: '2024-03-15T09:30:00',
  location: 'Blue Hole',
  depth: 28.4,
  duration: 45,
  lat: 0,
  lng: 0,
  ...over,
});

describe('calculateDiveStatistics', () => {
  // The dashboard renders these straight into stat tiles, so the empty case has
  // to produce real zeros rather than NaN from dividing by an empty list.
  it('returns zeroed stats for an empty log', () => {
    expect(calculateDiveStatistics([])).toEqual({
      totalDives: 0,
      totalBottomTime: 0,
      maxDepth: 0,
      avgDepth: 0,
      uniqueLocations: 0,
      lastDiveDate: null,
      deepestDive: null,
      longestDive: null,
    });
  });

  it('aggregates count, bottom time and depth', () => {
    const stats = calculateDiveStatistics([
      dive({ id: 1, depth: 30, duration: 45 }),
      dive({ id: 2, depth: 18, duration: 52 }),
      dive({ id: 3, depth: 12, duration: 38 }),
    ]);

    expect(stats.totalDives).toBe(3);
    expect(stats.totalBottomTime).toBe(135);
    expect(stats.maxDepth).toBe(30);
    expect(stats.avgDepth).toBe(20);
  });

  it('rounds average depth to one decimal', () => {
    const stats = calculateDiveStatistics([
      dive({ id: 1, depth: 10 }),
      dive({ id: 2, depth: 11 }),
      dive({ id: 3, depth: 13 }),
    ]);

    expect(stats.avgDepth).toBe(11.3);
  });

  it('counts distinct locations', () => {
    const stats = calculateDiveStatistics([
      dive({ id: 1, location: 'Blue Hole' }),
      dive({ id: 2, location: 'Thistlegorm' }),
      dive({ id: 3, location: 'Blue Hole' }),
    ]);

    expect(stats.uniqueLocations).toBe(2);
  });

  it('reports the most recent dive date regardless of input order', () => {
    const stats = calculateDiveStatistics([
      dive({ id: 1, datetime: '2024-03-15T09:30:00' }),
      dive({ id: 2, datetime: '2024-06-01T08:00:00' }),
      dive({ id: 3, datetime: '2024-01-02T14:00:00' }),
    ]);

    expect(stats.lastDiveDate).toBe('2024-06-01T08:00:00');
  });

  it('identifies the deepest and longest dives', () => {
    const stats = calculateDiveStatistics([
      dive({ id: 1, depth: 30, duration: 20 }),
      dive({ id: 2, depth: 12, duration: 62 }),
    ]);

    expect(stats.deepestDive?.id).toBe(1);
    expect(stats.longestDive?.id).toBe(2);
  });

  it('handles a single dive', () => {
    const stats = calculateDiveStatistics([dive({ depth: 22, duration: 40 })]);

    expect(stats).toMatchObject({ totalDives: 1, maxDepth: 22, avgDepth: 22, uniqueLocations: 1 });
  });

  it('does not reorder the caller’s array', () => {
    const dives = [
      dive({ id: 1, datetime: '2024-01-01T10:00:00' }),
      dive({ id: 2, datetime: '2024-06-01T10:00:00' }),
    ];
    calculateDiveStatistics(dives);

    expect(dives.map(d => d.id)).toEqual([1, 2]);
  });
});

describe('formatDuration', () => {
  it('shows minutes only under an hour', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('splits into hours and minutes past an hour', () => {
    expect(formatDuration(60)).toBe('1h 0m');
    expect(formatDuration(135)).toBe('2h 15m');
  });
});

describe('getRecentDives', () => {
  const dives = [
    dive({ id: 1, datetime: '2024-01-01T10:00:00' }),
    dive({ id: 2, datetime: '2024-06-01T10:00:00' }),
    dive({ id: 3, datetime: '2024-03-01T10:00:00' }),
  ];

  it('returns dives newest first', () => {
    expect(getRecentDives(dives).map(d => d.id)).toEqual([2, 3, 1]);
  });

  it('caps the result at the requested count', () => {
    expect(getRecentDives(dives, 2).map(d => d.id)).toEqual([2, 3]);
  });

  it('returns everything when there are fewer dives than requested', () => {
    expect(getRecentDives(dives, 10)).toHaveLength(3);
  });

  it('does not reorder the caller’s array', () => {
    getRecentDives(dives);
    expect(dives.map(d => d.id)).toEqual([1, 2, 3]);
  });
});

describe('getDivesByMonth', () => {
  it('groups dives by month in chronological order', () => {
    const result = getDivesByMonth([
      dive({ id: 1, datetime: '2024-06-01T10:00:00' }),
      dive({ id: 2, datetime: '2024-03-15T10:00:00' }),
      dive({ id: 3, datetime: '2024-03-20T10:00:00' }),
    ]);

    expect(result).toEqual([
      { month: 'Mar 2024', count: 2 },
      { month: 'Jun 2024', count: 1 },
    ]);
  });

  it('separates the same month across different years', () => {
    const result = getDivesByMonth([
      dive({ id: 1, datetime: '2024-03-01T10:00:00' }),
      dive({ id: 2, datetime: '2023-03-01T10:00:00' }),
    ]);

    expect(result).toEqual([
      { month: 'Mar 2023', count: 1 },
      { month: 'Mar 2024', count: 1 },
    ]);
  });

  it('returns an empty list for no dives', () => {
    expect(getDivesByMonth([])).toEqual([]);
  });
});

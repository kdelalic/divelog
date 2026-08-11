import { describe, expect, it } from 'vitest';
import type { Dive } from './dives';
import {
  EMPTY_DIVE_FILTERS,
  countActiveDiveFilters,
  diveFiltersFromSearchParams,
  diveFiltersToSearchParams,
  filterDives,
  sortDivesNewestFirst,
  type DiveFilters,
} from './diveFilters';

const dive = (overrides: Partial<Dive> = {}): Dive => ({
  id: 1,
  datetime: '2025-04-12T09:30:00',
  location: 'Monterey Breakwater',
  depth: 18,
  duration: 45,
  lat: 36.6,
  lng: -121.9,
  ...overrides,
});

const filters = (overrides: Partial<DiveFilters> = {}): DiveFilters => ({
  ...EMPTY_DIVE_FILTERS,
  ...overrides,
});

describe('filterDives', () => {
  const dives = [
		dive({ id: 1, buddy: 'Sam Rivera', notes: 'Kelp forest', rating: 5, diveType: 'recreational', tags: ['Wreck'], trip: { id: 9, name: 'Monterey weekend' } }),
    dive({
      id: 2,
      datetime: '2024-01-10T14:00:00',
      location: 'Blue Hole',
      depth: 32,
      buddy: 'Morgan',
      rating: 3,
      diveType: 'technical',
    }),
    dive({
      id: 3,
      datetime: '2025-06-20T08:15:00',
      location: 'Casino Point',
      depth: 12,
      notes: 'Training platform',
      diveType: 'training',
    }),
  ];

  it('returns all dives for empty filters', () => {
    expect(filterDives(dives, filters(), 'meters')).toEqual(dives);
  });

  it('searches location, buddy, and notes without case sensitivity', () => {
    expect(filterDives(dives, filters({ query: 'BLUE' }), 'meters').map(({ id }) => id)).toEqual([2]);
    expect(filterDives(dives, filters({ query: 'rivera' }), 'meters').map(({ id }) => id)).toEqual([1]);
    expect(filterDives(dives, filters({ query: 'platform' }), 'meters').map(({ id }) => id)).toEqual([3]);
  });

  it('applies inclusive date and depth ranges', () => {
    const result = filterDives(dives, filters({
      startDate: '2025-04-12',
      endDate: '2025-06-20',
      minDepth: '12',
      maxDepth: '18',
    }), 'meters');

    expect(result.map(({ id }) => id)).toEqual([1, 3]);
  });

  it('interprets depth inputs in the selected display unit', () => {
    const result = filterDives(dives, filters({ minDepth: '100' }), 'feet');
    expect(result.map(({ id }) => id)).toEqual([2]);
  });

  it('combines dive type and minimum rating filters', () => {
    expect(filterDives(dives, filters({
      diveType: 'recreational',
      minRating: '4',
    }), 'meters').map(({ id }) => id)).toEqual([1]);
  });

	it('filters by duration and recorded gas mix', () => {
		const gasDive = dive({
			id: 4,
			duration: 62,
			equipment: { tanks: [{ size: 12, working_pressure: 232, start_pressure: 200, end_pressure: 60, gas_mix: { oxygen: 32, name: 'EANx32' } }] },
		});
		expect(filterDives([...dives, gasDive], filters({ minDuration: '60', maxDuration: '70', gas: 'eanx32' }), 'meters').map(({ id }) => id)).toEqual([4]);
	});

  it('does not treat an unrated dive as meeting a rating filter', () => {
    expect(filterDives(dives, filters({ minRating: '1' }), 'meters').map(({ id }) => id)).toEqual([1, 2]);
  });

	it('searches and filters by reusable tag and trip', () => {
		expect(filterDives(dives, filters({ query: 'monterey weekend' }), 'meters').map(({ id }) => id)).toEqual([1]);
		expect(filterDives(dives, filters({ tag: 'wreck', tripId: '9' }), 'meters').map(({ id }) => id)).toEqual([1]);
		expect(filterDives(dives, filters({ tag: 'drift' }), 'meters')).toEqual([]);
	});
});

describe('filter URL state', () => {
  it('serializes active filters and omits empty values', () => {
    const params = diveFiltersToSearchParams(filters({
      query: 'kelp forest',
      minDepth: '10',
			minDuration: '30',
      diveType: 'recreational',
			tag: 'wreck',
			tripId: '9',
    }));

		expect(params.toString()).toBe('q=kelp+forest&minDepth=10&minDuration=30&type=recreational&tag=wreck&trip=9');
  });

  it('preserves spaces while the user is typing a multi-word search', () => {
    const params = diveFiltersToSearchParams(filters({ query: 'blue ' }));
    expect(diveFiltersFromSearchParams(params).query).toBe('blue ');
  });

  it('parses valid values and ignores unsupported URL values', () => {
    const params = new URLSearchParams(
      'q=kelp&from=2025-01-01&to=2025-13-40&minDepth=10&maxDepth=-2&type=cave&rating=8',
    );

    expect(diveFiltersFromSearchParams(params)).toEqual(filters({
      query: 'kelp',
      startDate: '2025-01-01',
      minDepth: '10',
    }));
  });

  it('counts each active filter', () => {
    expect(countActiveDiveFilters(filters({ query: 'kelp', startDate: '2025-01-01', minRating: '4' }))).toBe(3);
    expect(countActiveDiveFilters(filters())).toBe(0);
  });
});

describe('sortDivesNewestFirst', () => {
  it('sorts newest first without mutating the source array', () => {
    const source = [
      dive({ id: 1, datetime: '2024-01-01T10:00:00' }),
      dive({ id: 2, datetime: '2025-01-01T10:00:00' }),
    ];

    expect(sortDivesNewestFirst(source).map(({ id }) => id)).toEqual([2, 1]);
    expect(source.map(({ id }) => id)).toEqual([1, 2]);
  });
});

import type { Dive } from './dives';
import type { DepthUnit } from './settings';

export const DIVE_TYPES = [
  'recreational',
  'training',
  'technical',
  'work',
  'research',
] as const;

export type DiveTypeFilter = (typeof DIVE_TYPES)[number] | '';
export type RatingFilter = '1' | '2' | '3' | '4' | '5' | '';

export interface DiveFilters {
  query: string;
  startDate: string;
  endDate: string;
  minDepth: string;
  maxDepth: string;
  diveType: DiveTypeFilter;
  minRating: RatingFilter;
	tag: string;
	tripId: string;
}

export const EMPTY_DIVE_FILTERS: DiveFilters = {
  query: '',
  startDate: '',
  endDate: '',
  minDepth: '',
  maxDepth: '',
  diveType: '',
  minRating: '',
	tag: '',
	tripId: '',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const readDate = (value: string | null): string => {
  if (!value || !DATE_PATTERN.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? value
    : '';
};

const readNonNegativeNumber = (value: string | null): string => {
  if (value === null || value.trim() === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? value : '';
};

export const diveFiltersFromSearchParams = (params: URLSearchParams): DiveFilters => {
  const diveType = params.get('type');
  const minRating = params.get('rating');

  return {
    query: params.get('q') ?? '',
    startDate: readDate(params.get('from')),
    endDate: readDate(params.get('to')),
    minDepth: readNonNegativeNumber(params.get('minDepth')),
    maxDepth: readNonNegativeNumber(params.get('maxDepth')),
    diveType: DIVE_TYPES.includes(diveType as (typeof DIVE_TYPES)[number])
      ? diveType as DiveTypeFilter
      : '',
    minRating: ['1', '2', '3', '4', '5'].includes(minRating ?? '')
      ? minRating as RatingFilter
      : '',
		tag: params.get('tag')?.trim() ?? '',
		tripId: /^\d+$/.test(params.get('trip') ?? '') ? params.get('trip') ?? '' : '',
  };
};

export const diveFiltersToSearchParams = (filters: DiveFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.query.trim() !== '') params.set('q', filters.query);

  const entries: [string, string][] = [
    ['from', filters.startDate],
    ['to', filters.endDate],
    ['minDepth', filters.minDepth],
    ['maxDepth', filters.maxDepth],
    ['type', filters.diveType],
    ['rating', filters.minRating],
		['tag', filters.tag],
		['trip', filters.tripId],
  ];

  for (const [key, value] of entries) {
    if (value !== '') params.set(key, value);
  }

  return params;
};

export const countActiveDiveFilters = (filters: DiveFilters): number =>
  Object.values(filters).filter((value) => value.trim() !== '').length;

const depthInMeters = (value: string, unit: DepthUnit): number | undefined => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return unit === 'feet' ? parsed * 0.3048 : parsed;
};

export const filterDives = (
  dives: readonly Dive[],
  filters: DiveFilters,
  depthUnit: DepthUnit,
): Dive[] => {
  const query = filters.query.trim().toLocaleLowerCase();
  const minDepth = depthInMeters(filters.minDepth, depthUnit);
  const maxDepth = depthInMeters(filters.maxDepth, depthUnit);
  const minRating = filters.minRating === '' ? undefined : Number(filters.minRating);

  return dives.filter((dive) => {
		const searchableText = [dive.location, dive.buddy, dive.notes, dive.trip?.name, ...(dive.tags ?? [])]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLocaleLowerCase();
    const diveDate = dive.datetime.slice(0, 10);

    return (
      (query === '' || searchableText.includes(query))
      && (filters.startDate === '' || diveDate >= filters.startDate)
      && (filters.endDate === '' || diveDate <= filters.endDate)
      && (minDepth === undefined || dive.depth >= minDepth)
      && (maxDepth === undefined || dive.depth <= maxDepth)
      && (filters.diveType === '' || dive.diveType === filters.diveType)
      && (minRating === undefined || (dive.rating ?? 0) >= minRating)
			&& (filters.tag === '' || (dive.tags ?? []).some((tag) => tag.toLocaleLowerCase() === filters.tag.toLocaleLowerCase()))
			&& (filters.tripId === '' || String(dive.trip?.id ?? '') === filters.tripId)
    );
  });
};

export const sortDivesNewestFirst = (dives: readonly Dive[]): Dive[] =>
  [...dives].sort((a, b) => {
    const dateDifference = new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    return dateDifference !== 0 ? dateDifference : b.id - a.id;
  });

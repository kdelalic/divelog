import { getDiveGasNames, type Dive } from './dives';
import type { DepthUnit } from './settings';

export const DIVE_TYPES = [
  'recreational',
  'training',
  'technical',
  'work',
  'research',
] as const;
export const DIVE_MODES = ['OC', 'freedive', 'CCR', 'pSCR'] as const;

export type DiveTypeFilter = (typeof DIVE_TYPES)[number] | '';
export type DiveModeFilter = (typeof DIVE_MODES)[number] | '';
export type RatingFilter = '1' | '2' | '3' | '4' | '5' | '';

export interface DiveFilters {
  query: string;
  startDate: string;
  endDate: string;
  minDepth: string;
  maxDepth: string;
	minDuration: string;
	maxDuration: string;
  diveType: DiveTypeFilter;
	diveMode: DiveModeFilter;
  minRating: RatingFilter;
	tag: string;
	tripId: string;
	gas: string;
}

export const EMPTY_DIVE_FILTERS: DiveFilters = {
  query: '',
  startDate: '',
  endDate: '',
  minDepth: '',
  maxDepth: '',
	minDuration: '',
	maxDuration: '',
  diveType: '',
	diveMode: '',
  minRating: '',
	tag: '',
	tripId: '',
	gas: '',
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
	const diveMode = params.get('mode');

  return {
    query: params.get('q') ?? '',
    startDate: readDate(params.get('from')),
    endDate: readDate(params.get('to')),
    minDepth: readNonNegativeNumber(params.get('minDepth')),
    maxDepth: readNonNegativeNumber(params.get('maxDepth')),
		minDuration: readNonNegativeNumber(params.get('minDuration')),
		maxDuration: readNonNegativeNumber(params.get('maxDuration')),
    diveType: DIVE_TYPES.includes(diveType as (typeof DIVE_TYPES)[number])
      ? diveType as DiveTypeFilter
      : '',
		diveMode: DIVE_MODES.includes(diveMode as (typeof DIVE_MODES)[number])
			? diveMode as DiveModeFilter
			: '',
    minRating: ['1', '2', '3', '4', '5'].includes(minRating ?? '')
      ? minRating as RatingFilter
      : '',
		tag: params.get('tag')?.trim() ?? '',
		tripId: /^\d+$/.test(params.get('trip') ?? '') ? params.get('trip') ?? '' : '',
		gas: params.get('gas')?.trim() ?? '',
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
		['minDuration', filters.minDuration],
		['maxDuration', filters.maxDuration],
    ['type', filters.diveType],
		['mode', filters.diveMode],
    ['rating', filters.minRating],
		['tag', filters.tag],
		['trip', filters.tripId],
		['gas', filters.gas],
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
	const minDuration = filters.minDuration === '' ? undefined : Number(filters.minDuration);
	const maxDuration = filters.maxDuration === '' ? undefined : Number(filters.maxDuration);

  return dives.filter((dive) => {
		const gasNames = getDiveGasNames(dive);
		const searchableText = [dive.location, dive.buddy, dive.notes, dive.trip?.name, ...(dive.tags ?? []), ...gasNames]
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
			&& (minDuration === undefined || dive.duration >= minDuration)
			&& (maxDuration === undefined || dive.duration <= maxDuration)
      && (filters.diveType === '' || dive.diveType === filters.diveType)
			&& (filters.diveMode === '' || dive.diveMode === filters.diveMode)
      && (minRating === undefined || (dive.rating ?? 0) >= minRating)
			&& (filters.tag === '' || (dive.tags ?? []).some((tag) => tag.toLocaleLowerCase() === filters.tag.toLocaleLowerCase()))
			&& (filters.tripId === '' || String(dive.trip?.id ?? '') === filters.tripId)
			&& (filters.gas === '' || gasNames.some((gas) => gas.toLocaleLowerCase() === filters.gas.toLocaleLowerCase()))
    );
  });
};

export const sortDivesNewestFirst = (dives: readonly Dive[]): Dive[] =>
  [...dives].sort((a, b) => {
    const dateDifference = new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    return dateDifference !== 0 ? dateDifference : b.id - a.id;
  });

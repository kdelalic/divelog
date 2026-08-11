import { getDiveGasNames, type Dive } from './dives';
import type { DiveFilters } from './diveFilters';
import type { DepthUnit } from './settings';
import { convertDepth } from './unitConversions';

export interface AnalyticsBucket {
  key: string;
  label: string;
  count: number;
  bottomTime: number;
  filters: Partial<DiveFilters>;
}

const summarize = (
  dives: readonly Dive[],
  values: (dive: Dive) => Array<{ key: string; label: string; filters: Partial<DiveFilters> }>,
): AnalyticsBucket[] => {
  const buckets = new Map<string, AnalyticsBucket>();
  for (const dive of dives) {
    for (const value of values(dive)) {
      const bucket = buckets.get(value.key) ?? { ...value, count: 0, bottomTime: 0 };
      bucket.count += 1;
      bucket.bottomTime += dive.duration;
      buckets.set(value.key, bucket);
    }
  }
  return [...buckets.values()];
};

export const activityByMonth = (dives: readonly Dive[]): AnalyticsBucket[] => summarize(dives, (dive) => {
  const [year, month] = dive.datetime.slice(0, 7).split('-').map(Number);
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [{
    key,
    label: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    filters: { startDate: `${key}-01`, endDate: `${key}-${String(lastDay).padStart(2, '0')}` },
  }];
}).sort((a, b) => a.key.localeCompare(b.key));

const histogram = (
  dives: readonly Dive[],
  value: (dive: Dive) => number,
  step: number,
  suffix: string,
  minimumField: 'minDepth' | 'minDuration',
  maximumField: 'maxDepth' | 'maxDuration',
): AnalyticsBucket[] => summarize(dives, (dive) => {
  const measured = value(dive);
  const minimum = Math.floor(measured / step) * step;
  const maximum = minimum + step;
  return [{
    key: String(minimum).padStart(8, '0'),
    label: `${minimum}–<${maximum}${suffix}`,
    filters: { [minimumField]: String(minimum), [maximumField]: String(maximum - 0.01) },
  }];
}).sort((a, b) => a.key.localeCompare(b.key));

export const depthDistribution = (dives: readonly Dive[], unit: DepthUnit): AnalyticsBucket[] => {
  const step = unit === 'meters' ? 10 : 30;
  return histogram(
    dives,
    (dive) => unit === 'meters' ? dive.depth : convertDepth(dive.depth, 'meters', 'feet'),
    step,
    unit === 'meters' ? 'm' : 'ft',
    'minDepth',
    'maxDepth',
  );
};

export const durationDistribution = (dives: readonly Dive[]): AnalyticsBucket[] =>
  histogram(dives, (dive) => dive.duration, 15, ' min', 'minDuration', 'maxDuration');

const mostUsed = (buckets: AnalyticsBucket[], limit = 10) => buckets
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  .slice(0, limit);

export const divesBySite = (dives: readonly Dive[]) => mostUsed(summarize(dives, (dive) => [{
  key: dive.location.toLocaleLowerCase(), label: dive.location, filters: { query: dive.location },
}]));

export const divesByTag = (dives: readonly Dive[]) => mostUsed(summarize(dives, (dive) =>
  [...new Set(dive.tags ?? [])].map((tag) => ({ key: tag.toLocaleLowerCase(), label: tag, filters: { tag } })),
));

export const divesByTrip = (dives: readonly Dive[]) => mostUsed(summarize(dives, (dive) => dive.trip ? [{
  key: String(dive.trip.id), label: dive.trip.name, filters: { tripId: String(dive.trip.id) },
}] : []));

export const divesByGas = (dives: readonly Dive[]) => mostUsed(summarize(dives, (dive) =>
  getDiveGasNames(dive).map((gas) => ({ key: gas.toLocaleLowerCase(), label: gas, filters: { gas } })),
));

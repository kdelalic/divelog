import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnalyticsBarChart from '@/components/AnalyticsBarChart';
import DashboardStats from '@/components/DashboardStats';
import DiveFilters from '@/components/DiveFilters';
import {
  activityByMonth,
  depthDistribution,
  divesByGas,
  divesBySite,
  divesByTag,
  divesByTrip,
  durationDistribution,
  type AnalyticsBucket,
} from '@/lib/analytics';
import { calculateDiveStatistics } from '@/lib/diveStats';
import {
  EMPTY_DIVE_FILTERS,
  diveFiltersFromSearchParams,
  diveFiltersToSearchParams,
  filterDives,
  type DiveFilters as DiveFilterValues,
} from '@/lib/diveFilters';
import useDiveStore from '@/store/diveStore';
import useOrganizationStore from '@/store/organizationStore';
import useSettingsStore from '@/store/settingsStore';

const Statistics = () => {
  const dives = useDiveStore((state) => state.dives);
  const settings = useSettingsStore((state) => state.settings);
  const tags = useOrganizationStore((state) => state.tags);
  const trips = useOrganizationStore((state) => state.trips);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.toString();
  const filters = useMemo(() => diveFiltersFromSearchParams(new URLSearchParams(query)), [query]);
  const filteredDives = useMemo(
    () => filterDives(dives, filters, settings.units.depth),
    [dives, filters, settings.units.depth],
  );
  const statistics = useMemo(() => calculateDiveStatistics(filteredDives), [filteredDives]);
  const datasets = useMemo(() => ({
    activity: activityByMonth(filteredDives),
    depth: depthDistribution(filteredDives, settings.units.depth),
    duration: durationDistribution(filteredDives),
    sites: divesBySite(filteredDives),
    tags: divesByTag(filteredDives),
    trips: divesByTrip(filteredDives),
    gases: divesByGas(filteredDives),
  }), [filteredDives, settings.units.depth]);

  const updateFilters = (next: DiveFilterValues) => setSearchParams(diveFiltersToSearchParams(next), { replace: true });
  const inspect = (item: AnalyticsBucket) => {
    const next = { ...filters, ...item.filters };
    navigate({ pathname: '/', search: diveFiltersToSearchParams(next).toString() });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Statistics</h1>
        <p className="mt-3 text-lg text-muted-foreground">Explore activity, depth, duration, sites, trips, tags, and breathing gases.</p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <DiveFilters filters={filters} depthUnit={settings.units.depth} resultCount={filteredDives.length} totalCount={dives.length} onChange={updateFilters} onClear={() => updateFilters(EMPTY_DIVE_FILTERS)} tags={tags.map((tag) => tag.name)} trips={trips} />
      </div>
      <DashboardStats stats={statistics} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsBarChart title="Dive activity" description="Number of dives by month" items={datasets.activity} onSelect={inspect} />
        <AnalyticsBarChart title="Bottom time" description="Hours underwater by month" items={datasets.activity} onSelect={inspect} value="bottomTime" />
        <AnalyticsBarChart title="Depth distribution" description={`Maximum depth bands in ${settings.units.depth === 'meters' ? 'meters' : 'feet'}`} items={datasets.depth} onSelect={inspect} />
        <AnalyticsBarChart title="Duration distribution" description="Dive duration in 15-minute bands" items={datasets.duration} onSelect={inspect} />
        <AnalyticsBarChart title="Top dive sites" description="Most frequently visited locations" items={datasets.sites} onSelect={inspect} />
        <AnalyticsBarChart title="Trips" description="Dive activity by trip" items={datasets.trips} onSelect={inspect} />
        <AnalyticsBarChart title="Tags" description="Reusable logbook categories" items={datasets.tags} onSelect={inspect} />
        <AnalyticsBarChart title="Breathing gases" description="Dives using each recorded gas mix" items={datasets.gases} onSelect={inspect} />
      </div>
    </div>
  );
};

export default Statistics;

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DIVE_TYPES,
  countActiveDiveFilters,
  type DiveFilters as DiveFilterValues,
} from '@/lib/diveFilters';
import type { DepthUnit } from '@/lib/settings';
import type { Trip } from '@/lib/dives';

interface DiveFiltersProps {
  filters: DiveFilterValues;
  depthUnit: DepthUnit;
  resultCount: number;
  totalCount: number;
  onChange: (filters: DiveFilterValues) => void;
  onClear: () => void;
	tags: string[];
	trips: Trip[];
}

const DIVE_TYPE_LABELS: Record<(typeof DIVE_TYPES)[number], string> = {
  recreational: 'Recreational',
  training: 'Training',
  technical: 'Technical',
  work: 'Work',
  research: 'Research',
};

const DiveFilters = ({
  filters,
  depthUnit,
  resultCount,
  totalCount,
  onChange,
  onClear,
	tags,
	trips,
}: DiveFiltersProps) => {
  const activeCount = countActiveDiveFilters(filters);
  const update = <Key extends keyof DiveFilterValues>(key: Key, value: DiveFilterValues[Key]) => {
    onChange({ ...filters, [key]: value });
  };
  const activeFilters: {
    key: keyof DiveFilterValues;
    label: string;
  }[] = [
    filters.query.trim() && { key: 'query', label: `Search: “${filters.query.trim()}”` },
    filters.startDate && { key: 'startDate', label: `From ${filters.startDate}` },
    filters.endDate && { key: 'endDate', label: `To ${filters.endDate}` },
    filters.minDepth && {
      key: 'minDepth',
      label: `Depth ≥ ${filters.minDepth}${depthUnit === 'meters' ? 'm' : 'ft'}`,
    },
    filters.maxDepth && {
      key: 'maxDepth',
      label: `Depth ≤ ${filters.maxDepth}${depthUnit === 'meters' ? 'm' : 'ft'}`,
    },
    filters.diveType && {
      key: 'diveType',
      label: DIVE_TYPE_LABELS[filters.diveType],
    },
    filters.minRating && {
      key: 'minRating',
      label: `${filters.minRating}+ stars`,
    },
		filters.tag && { key: 'tag', label: `Tag: ${filters.tag}` },
		filters.tripId && { key: 'tripId', label: `Trip: ${trips.find((trip) => String(trip.id) === filters.tripId)?.name ?? filters.tripId}` },
  ].filter((filter): filter is { key: keyof DiveFilterValues; label: string } => Boolean(filter));

  return (
    <section className="space-y-5 px-5 py-5 sm:px-8" role="search" aria-label="Filter dives">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search dives"
            placeholder="Search location, buddy, or notes"
            value={filters.query}
            onChange={(event) => update('query', event.target.value)}
            className="h-10 border-input bg-background pl-9"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{resultCount}</span> of {totalCount}{' '}
            {totalCount === 1 ? 'dive' : 'dives'}
          </p>
          {activeCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <div className="space-y-2">
          <Label htmlFor="filter-start-date">From</Label>
          <Input
            id="filter-start-date"
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onChange={(event) => update('startDate', event.target.value)}
            className="border-input bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-end-date">To</Label>
          <Input
            id="filter-end-date"
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={(event) => update('endDate', event.target.value)}
            className="border-input bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-min-depth">
            Min depth ({depthUnit === 'meters' ? 'm' : 'ft'})
          </Label>
          <Input
            id="filter-min-depth"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="Any"
            value={filters.minDepth}
            onChange={(event) => update('minDepth', event.target.value)}
            className="border-input bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-max-depth">
            Max depth ({depthUnit === 'meters' ? 'm' : 'ft'})
          </Label>
          <Input
            id="filter-max-depth"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="Any"
            value={filters.maxDepth}
            onChange={(event) => update('maxDepth', event.target.value)}
            className="border-input bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-dive-type">Dive type</Label>
          <Select
            value={filters.diveType || 'all'}
            onValueChange={(value) => update(
              'diveType',
              value === 'all' ? '' : value as DiveFilterValues['diveType'],
            )}
          >
            <SelectTrigger id="filter-dive-type" className="border-input bg-background">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {DIVE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{DIVE_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-rating">Minimum rating</Label>
          <Select
            value={filters.minRating || 'all'}
            onValueChange={(value) => update(
              'minRating',
              value === 'all' ? '' : value as DiveFilterValues['minRating'],
            )}
          >
            <SelectTrigger id="filter-rating" className="border-input bg-background">
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any rating</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  {rating}+ {rating === 1 ? 'star' : 'stars'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
			<div className="space-y-2">
				<Label htmlFor="filter-tag">Tag</Label>
				<Select value={filters.tag || 'all'} onValueChange={(value) => update('tag', value === 'all' ? '' : value)}>
					<SelectTrigger id="filter-tag" className="border-input bg-background"><SelectValue placeholder="All tags" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All tags</SelectItem>
						{tags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label htmlFor="filter-trip">Trip</Label>
				<Select value={filters.tripId || 'all'} onValueChange={(value) => update('tripId', value === 'all' ? '' : value)}>
					<SelectTrigger id="filter-trip" className="border-input bg-background"><SelectValue placeholder="All trips" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All trips</SelectItem>
						{trips.map((trip) => <SelectItem key={trip.id} value={String(trip.id)}>{trip.name}</SelectItem>)}
					</SelectContent>
				</Select>
			</div>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          <span className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {activeCount} active
          </span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => update(filter.key, '')}
              aria-label={`Remove ${filter.label} filter`}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
            >
              {filter.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default DiveFilters;

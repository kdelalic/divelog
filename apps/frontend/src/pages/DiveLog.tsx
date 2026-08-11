import { Link, useSearchParams } from "react-router-dom";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import useDiveStore from "../store/diveStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DashboardStats from "@/components/DashboardStats";
import DiveChart from "@/components/DiveChart";
import RecentDives from "@/components/RecentDives";
import DiveDetailModal from "@/components/DiveDetailModal";
import DiveImport from "@/components/DiveImport";
import DiveFilters from "@/components/DiveFilters";
import DataTransferDialog from "@/components/DataTransferDialog";
import { calculateDiveStatistics } from "@/lib/diveStats";
import {
  EMPTY_DIVE_FILTERS,
  countActiveDiveFilters,
  diveFiltersFromSearchParams,
  diveFiltersToSearchParams,
  filterDives,
  sortDivesNewestFirst,
  type DiveFilters as DiveFilterValues,
} from "@/lib/diveFilters";
import type { Dive } from "@/lib/dives";
import useSettingsStore from "@/store/settingsStore";
import { formatDepth } from "@/lib/unitConversions";
import { formatDiveDateTime } from "@/lib/dateHelpers";
import { diveSitesApi, organizationApi } from "@/lib/api";
import type { ImportedDiveSite } from "@/lib/subsurfaceXmlParser";
import type { BackupDive, BackupDiveSite, BackupTrip } from "@/lib/dataTransfer";
import type { UserSettings } from "@/lib/settings";
import useOrganizationStore from "@/store/organizationStore";
import LogbookOrganizationDialog from "@/components/LogbookOrganizationDialog";
import BulkDiveEditDialog from "@/components/BulkDiveEditDialog";
import type { BulkDiveUpdateInput } from "@/lib/api";

const DiveLog = () => {
  const dives = useDiveStore((state) => state.dives);
  const deleteDive = useDiveStore((state) => state.deleteDive);
  const importDives = useDiveStore((state) => state.importDives);
  const clearAllDives = useDiveStore((state) => state.clearAllDives);
  const clearError = useDiveStore((state) => state.error);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
	const tags = useOrganizationStore((state) => state.tags);
	const trips = useOrganizationStore((state) => state.trips);
	const loadOrganization = useOrganizationStore((state) => state.load);
	const bulkUpdateDives = useOrganizationStore((state) => state.bulkUpdateDives);
	const bulkDeleteDives = useOrganizationStore((state) => state.bulkDeleteDives);
  const stats = calculateDiveStatistics(dives);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterQuery = searchParams.toString();
  const filters = useMemo(
    () => diveFiltersFromSearchParams(new URLSearchParams(filterQuery)),
    [filterQuery],
  );
  const filteredDives = useMemo(
    () => sortDivesNewestFirst(filterDives(dives, filters, settings.units.depth)),
    [dives, filters, settings.units.depth],
  );
  const hasActiveFilters = countActiveDiveFilters(filters) > 0;
  const [selectedDive, setSelectedDive] = useState<Dive | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDataTransfer, setShowDataTransfer] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);
	const [showOrganization, setShowOrganization] = useState(false);
	const [groupByTrip, setGroupByTrip] = useState(true);
	const [collapsedTrips, setCollapsedTrips] = useState<Set<string>>(new Set());
	const [selectedDiveIds, setSelectedDiveIds] = useState<Set<number>>(new Set());
	const [showBulkEdit, setShowBulkEdit] = useState(false);
	const tripGroups = useMemo(() => {
		const groups = new Map<string, { key: string; label: string; detail?: string; dives: Dive[] }>();
		for (const dive of filteredDives) {
			const key = dive.trip ? String(dive.trip.id) : 'unassigned';
			const label = dive.trip?.name ?? 'No trip';
			const detail = dive.trip ? [dive.trip.location, dive.trip.startDate && dive.trip.endDate ? `${dive.trip.startDate} – ${dive.trip.endDate}` : dive.trip.startDate].filter(Boolean).join(' · ') : undefined;
			const group = groups.get(key) ?? { key, label, detail, dives: [] };
			group.dives.push(dive);
			groups.set(key, group);
		}
		return [...groups.values()];
	}, [filteredDives]);
	const visibleDiveIds = useMemo(() => filteredDives.map((dive) => dive.id), [filteredDives]);
	const allVisibleSelected = visibleDiveIds.length > 0 && visibleDiveIds.every((id) => selectedDiveIds.has(id));

  // The matching backend route only exists outside release mode
  const isDevBuild = import.meta.env.DEV;

  const handleRowClick = (dive: Dive) => {
    setSelectedDive(dive);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDive(null);
  };

  const handleImportDives = async (importedDives: Dive[]) => {
    const imported = await importDives(importedDives);
    if (!imported) {
      throw new Error(
        useDiveStore.getState().error ?? 'The dives could not be saved. Please try again.',
      );
    }
    setShowImport(false);
  };

  const handleImportSites = async (sites: ImportedDiveSite[]) => {
    const failures: string[] = [];
    for (const site of sites) {
      const result = await diveSitesApi.createDiveSite(site);
      // A duplicate means the site is already present, so re-imports stay safe.
      if (result.error && result.status !== 409) failures.push(`${site.name}: ${result.error}`);
    }
    if (failures.length > 0) {
      throw new Error(
        `Could not import ${failures.length} site${failures.length === 1 ? '' : 's'}: ${failures[0]}`,
      );
    }
    setShowImport(false);
  };

  const loadDiveSitesForTransfer = async () => {
    const result = await diveSitesApi.fetchDiveSites();
    if (result.error) throw new Error(result.error);
    return result.data ?? [];
  };

  const handleRestoreDives = async (backupDives: BackupDive[]) => {
    const restored = await importDives(backupDives);
    if (!restored) {
      throw new Error(
        useDiveStore.getState().error ?? 'The dives could not be restored. Please try again.',
      );
    }
  };

  const handleRestoreSites = async (sites: BackupDiveSite[]) => {
    const failures: string[] = [];
    for (const site of sites) {
      const result = await diveSitesApi.createDiveSite(site);
      if (result.error && result.status !== 409) failures.push(`${site.name}: ${result.error}`);
    }
    if (failures.length > 0) {
      throw new Error(
        `Could not restore ${failures.length} site${failures.length === 1 ? '' : 's'}: ${failures[0]}`,
      );
    }
  };

  const handleRestoreSettings = async (backupSettings: UserSettings) => {
    await updateSettings(backupSettings);
    const settingsError = useSettingsStore.getState().error;
    if (settingsError) throw new Error(`Could not restore settings: ${settingsError}`);
  };

	const handleRestoreOrganization = async (backupTrips: BackupTrip[], backupTags: string[]) => {
		for (const tag of backupTags) {
			const result = await organizationApi.createTag(tag);
			if (result.error && result.status !== 409) throw new Error(`Could not restore tag “${tag}”: ${result.error}`);
		}
		for (const trip of backupTrips) {
			const result = await organizationApi.createTrip(trip);
			if (result.error && result.status !== 409) throw new Error(`Could not restore trip “${trip.name}”: ${result.error}`);
		}
		await loadOrganization();
	};

  const handleClearAllDives = async () => {
    setIsClearing(true);
    setClearFailed(false);
    try {
      const cleared = await clearAllDives();
      if (cleared) {
        setShowClearConfirm(false);
      } else {
        setClearFailed(true);
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearDialogChange = (open: boolean) => {
    if (isClearing) return;
    setShowClearConfirm(open);
    if (!open) setClearFailed(false);
  };

  const handleFiltersChange = (nextFilters: DiveFilterValues) => {
	setSelectedDiveIds(new Set());
    setSearchParams(diveFiltersToSearchParams(nextFilters), { replace: true });
  };

  const handleClearFilters = () => {
	setSelectedDiveIds(new Set());
    setSearchParams(diveFiltersToSearchParams(EMPTY_DIVE_FILTERS), { replace: true });
  };

	const toggleDiveSelection = (diveId: number, selected: boolean) => {
		setSelectedDiveIds((current) => {
			const next = new Set(current);
			if (selected) next.add(diveId); else next.delete(diveId);
			return next;
		});
	};

	const toggleSelection = (diveIds: number[], selected: boolean) => {
		setSelectedDiveIds((current) => {
			const next = new Set(current);
			for (const id of diveIds) {
				if (selected) next.add(id); else next.delete(id);
			}
			return next;
		});
	};

	const handleBulkUpdate = async (request: BulkDiveUpdateInput) => {
		const success = await bulkUpdateDives(request);
		if (success) setSelectedDiveIds(new Set());
		return success;
	};

	const handleBulkDelete = async () => {
		const ids = [...selectedDiveIds];
		if (ids.length === 0 || !window.confirm(`Delete ${ids.length} selected dive${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
		if (await bulkDeleteDives(ids)) setSelectedDiveIds(new Set());
	};

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="-mx-4 -mt-6 border-b border-border bg-gradient-to-br from-muted/60 to-background sm:-mx-6 lg:-mx-8 lg:-mt-8 xl:-mx-12">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
            <div className="flex-1">
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground lg:text-6xl">
                Dive Dashboard
              </h1>
              <p className="max-w-2xl text-xl text-muted-foreground">
                Track and analyze your diving adventures with comprehensive logging and insights
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-shrink-0 lg:justify-end">
              {isDevBuild && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setClearFailed(false);
                    setShowClearConfirm(true);
                  }}
                  disabled={dives.length === 0}
                  title="Development only: removes every dive from the database"
                  className="border-red-300 bg-background px-8 py-4 text-base font-medium text-red-700 shadow-sm hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50 dark:hover:text-red-200"
                >
                  Delete All Dives (dev)
                </Button>
              )}
              <Button
				variant="outline"
				size="lg"
				onClick={() => setShowOrganization(true)}
				className="border-input bg-background px-8 py-4 text-base font-medium text-foreground shadow-sm hover:bg-muted"
			  >
				Organize
			  </Button>
			  <Button
                variant="outline"
                size="lg"
                onClick={() => setShowDataTransfer(true)}
                className="border-input bg-background px-8 py-4 text-base font-medium text-foreground shadow-sm hover:bg-muted"
              >
                Backup &amp; Export
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowImport(true)}
                className="border-input bg-background px-8 py-4 text-base font-medium text-foreground shadow-sm hover:bg-muted"
              >
                Import
              </Button>
              <Link to="/add">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 py-4 text-base font-medium shadow-lg hover:shadow-xl transition-all">
                  Add Dive
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <DashboardStats stats={stats} />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <DiveChart dives={dives} />
        </div>
        <div className="lg:col-span-2">
          <RecentDives dives={dives} />
        </div>
      </div>

      {/* Table Section */}
      <div id="table" className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm ring-1 ring-border">
        <div className="border-b border-border bg-muted/30 px-8 py-6">
          <h3 className="text-xl font-semibold text-foreground">All Dives</h3>
          <p className="mt-1 text-sm text-muted-foreground">Complete history of your dive activities</p>
        </div>
        <DiveFilters
          filters={filters}
          depthUnit={settings.units.depth}
          resultCount={filteredDives.length}
          totalCount={dives.length}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
			tags={tags.map((tag) => tag.name)}
			trips={trips}
        />
		<div className="flex items-center justify-end border-t border-border px-8 py-3">
			<label className="flex items-center gap-2 text-sm text-muted-foreground">
				<input type="checkbox" checked={groupByTrip} onChange={(event) => setGroupByTrip(event.target.checked)} />
				Group by trip
			</label>
		</div>
        <div className="overflow-x-auto border-t border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
				<th scope="col" className="w-12 px-4 py-4 text-left">
					<input
						type="checkbox"
						aria-label="Select all filtered dives"
						checked={allVisibleSelected}
						onChange={(event) => toggleSelection(visibleDiveIds, event.target.checked)}
					/>
				</th>
				<th scope="col" className="px-5 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground">#</th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground">Date</th>
                <th scope="col" className="w-2/6 px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground">Location</th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground">
                  Depth ({settings.units.depth === 'meters' ? 'm' : 'ft'})
                </th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground">Duration</th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground">Buddy</th>
                <th scope="col" className="w-1/6 relative px-8 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
			  {(groupByTrip ? tripGroups : [{ key: 'all', label: '', detail: undefined, dives: filteredDives }]).map((group) => (
				<Fragment key={group.key}>
				{groupByTrip && (
					<tr className="bg-muted/50">
							<td colSpan={8} className="px-4 py-3">
								<div className="flex items-center gap-3">
									<input
										type="checkbox"
										aria-label={`Select all dives in ${group.label}`}
										checked={group.dives.every((dive) => selectedDiveIds.has(dive.id))}
										onChange={(event) => toggleSelection(group.dives.map((dive) => dive.id), event.target.checked)}
									/>
								<button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => setCollapsedTrips((current) => { const next = new Set(current); if (next.has(group.key)) next.delete(group.key); else next.add(group.key); return next; })}>
									{collapsedTrips.has(group.key) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
									<span className="font-semibold text-foreground">{group.label}</span>
									<span className="text-sm text-muted-foreground">{group.dives.length} dive{group.dives.length === 1 ? '' : 's'}{group.detail ? ` · ${group.detail}` : ''}</span>
								</button>
								</div>
							</td>
					</tr>
				)}
				{!collapsedTrips.has(group.key) && group.dives.map((dive) => (
				<tr key={dive.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-muted/50"
                  onClick={() => handleRowClick(dive)}
	                >
					  <td className="px-4 py-5" onClick={(event) => event.stopPropagation()}>
						<input
							type="checkbox"
							aria-label={`Select dive ${dive.diveNumber ?? dive.id}`}
							checked={selectedDiveIds.has(dive.id)}
							onChange={(event) => toggleDiveSelection(dive.id, event.target.checked)}
						/>
					  </td>
					  <td className="whitespace-nowrap px-5 py-5 text-sm font-semibold text-foreground">{dive.diveNumber ?? '—'}</td>
                  <td className="whitespace-nowrap px-8 py-5 text-sm font-medium text-foreground lg:text-base">
                    {formatDiveDateTime(dive.datetime, settings)}
                  </td>
				  <td className="px-8 py-5 text-sm font-medium text-muted-foreground lg:text-base">
					<div>{dive.location}</div>
					{Boolean(dive.tags?.length) && <div className="mt-1 flex flex-wrap gap-1">{dive.tags?.map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">{tag}</span>)}</div>}
				  </td>
                  <td className="whitespace-nowrap px-8 py-5 text-sm font-semibold text-blue-600 dark:text-blue-400 lg:text-base">
                    {formatDepth(dive.depth, settings.units.depth, 0)}
                  </td>
                  <td className="whitespace-nowrap px-8 py-5 text-sm text-muted-foreground lg:text-base">{dive.duration} min</td>
                  <td className="whitespace-nowrap px-8 py-5 text-sm text-muted-foreground lg:text-base">{dive.buddy || '—'}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
                      >
                        <Link to={`/edit/${dive.id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-3 py-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this dive?")) {
                            deleteDive(dive.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
				))}
				</Fragment>
			  ))}
              {filteredDives.length === 0 && (
                <tr>
					  <td colSpan={8} className="px-8 py-14 text-center">
                    <p className="font-semibold text-foreground">
                      {hasActiveFilters ? 'No dives match these filters' : 'No dives logged yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? 'Try widening the date or depth range, or clear the filters.'
                        : 'Add or import a dive to start your logbook.'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        className="mt-4"
                      >
                        Clear filters
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

	  {selectedDiveIds.size > 0 && (
		<div className="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-xl">
			<span className="text-sm font-semibold">{selectedDiveIds.size} selected</span>
			<Button size="sm" onClick={() => setShowBulkEdit(true)}>Edit selected</Button>
			<Button size="sm" variant="outline" className="text-red-600 dark:text-red-400" onClick={handleBulkDelete}>Delete</Button>
			<Button size="sm" variant="ghost" onClick={() => setSelectedDiveIds(new Set())}>Clear</Button>
		</div>
	  )}

      <DiveDetailModal 
        dive={selectedDive}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

	  <LogbookOrganizationDialog open={showOrganization} onOpenChange={setShowOrganization} dives={dives} />
	  <BulkDiveEditDialog
		open={showBulkEdit}
		onOpenChange={setShowBulkEdit}
		selectedCount={selectedDiveIds.size}
		diveIds={[...selectedDiveIds]}
		trips={trips}
		onApply={handleBulkUpdate}
	  />

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Dive Data</DialogTitle>
          </DialogHeader>
          <DiveImport onImportDives={handleImportDives} onImportSites={handleImportSites} />
        </DialogContent>
      </Dialog>

      <DataTransferDialog
        open={showDataTransfer}
        onOpenChange={setShowDataTransfer}
        dives={dives}
        filteredDives={filteredDives}
        hasActiveFilters={hasActiveFilters}
        settings={settings}
        loadDiveSites={loadDiveSitesForTransfer}
        restoreDives={handleRestoreDives}
        restoreDiveSites={handleRestoreSites}
        restoreSettings={handleRestoreSettings}
		trips={trips}
		tags={tags.map((tag) => tag.name)}
		restoreOrganization={handleRestoreOrganization}
      />

      <Dialog open={showClearConfirm} onOpenChange={handleClearDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all dives?</DialogTitle>
            <DialogDescription>
              This permanently deletes all {dives.length} dive
              {dives.length === 1 ? "" : "s"} from the database. It cannot be
              undone. Dive sites and settings are kept.
            </DialogDescription>
            {clearFailed && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                Could not delete the dives. {clearError ?? "Please try again."}
              </p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAllDives}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isClearing ? "Clearing..." : `Delete ${dives.length} dive${dives.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiveLog;

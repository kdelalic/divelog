import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
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
import { diveSitesApi } from "@/lib/api";
import type { ImportedDiveSite } from "@/lib/subsurfaceXmlParser";
import type { BackupDive, BackupDiveSite } from "@/lib/dataTransfer";
import type { UserSettings } from "@/lib/settings";

const DiveLog = () => {
  const dives = useDiveStore((state) => state.dives);
  const deleteDive = useDiveStore((state) => state.deleteDive);
  const importDives = useDiveStore((state) => state.importDives);
  const clearAllDives = useDiveStore((state) => state.clearAllDives);
  const clearError = useDiveStore((state) => state.error);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
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
    setSearchParams(diveFiltersToSearchParams(nextFilters), { replace: true });
  };

  const handleClearFilters = () => {
    setSearchParams(diveFiltersToSearchParams(EMPTY_DIVE_FILTERS), { replace: true });
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 -mt-6 lg:-mt-8">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
            <div className="flex-1">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Dive Dashboard
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl">
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
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 px-8 py-4 text-base font-medium shadow-sm"
                >
                  Delete All Dives (dev)
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowDataTransfer(true)}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-base font-medium shadow-sm"
              >
                Backup &amp; Export
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowImport(true)}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-base font-medium shadow-sm"
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
      <div id="table" className="bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-xl">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xl font-semibold text-slate-900">All Dives</h3>
          <p className="mt-1 text-sm text-slate-600">Complete history of your dive activities</p>
        </div>
        <DiveFilters
          filters={filters}
          depthUnit={settings.units.depth}
          resultCount={filteredDives.length}
          totalCount={dives.length}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
        />
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                <th scope="col" className="w-2/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Location</th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Depth ({settings.units.depth === 'meters' ? 'm' : 'ft'})
                </th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Duration</th>
                <th scope="col" className="w-1/6 px-8 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">Buddy</th>
                <th scope="col" className="w-1/6 relative px-8 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredDives.map((dive) => (
                <tr
                  key={dive.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleRowClick(dive)}
                >
                  <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base font-medium text-slate-900">
                    {formatDiveDateTime(dive.datetime, settings)}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600 font-medium">{dive.location}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600 font-semibold text-blue-600">
                    {formatDepth(dive.depth, settings.units.depth, 0)}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600">{dive.duration} min</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm lg:text-base text-slate-600">{dive.buddy || '—'}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1"
                      >
                        <Link to={`/edit/${dive.id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1"
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
              {filteredDives.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-14 text-center">
                    <p className="font-semibold text-slate-900">
                      {hasActiveFilters ? 'No dives match these filters' : 'No dives logged yet'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
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

      <DiveDetailModal 
        dive={selectedDive}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
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
              <p role="alert" className="text-sm text-red-600">
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

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, DatabaseBackup, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Dive } from '@/lib/dives';
import type { UserSettings } from '@/lib/settings';
import type { DiveSite } from '@/lib/api';
import {
  MAX_BACKUP_BYTES,
  createDiveLogBackup,
  datedExportFilename,
  divesToCsv,
  parseDiveLogBackup,
  planDiveRestore,
  planDiveSiteRestore,
  serializeDiveLogBackup,
  type BackupDive,
  type BackupDiveSite,
  type DiveLogBackup,
} from '@/lib/dataTransfer';

interface DataTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dives: Dive[];
  filteredDives: Dive[];
  hasActiveFilters: boolean;
  settings: UserSettings;
  loadDiveSites: () => Promise<DiveSite[]>;
  restoreDives: (dives: BackupDive[]) => Promise<void>;
  restoreDiveSites: (diveSites: BackupDiveSite[]) => Promise<void>;
  restoreSettings: (settings: UserSettings) => Promise<void>;
}

const downloadTextFile = (contents: string, filename: string, mimeType: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const DataTransferDialog = ({
  open,
  onOpenChange,
  dives,
  filteredDives,
  hasActiveFilters,
  settings,
  loadDiveSites,
  restoreDives,
  restoreDiveSites,
  restoreSettings,
}: DataTransferDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvScope, setCsvScope] = useState<'all' | 'filtered'>(
    hasActiveFilters ? 'filtered' : 'all',
  );
  const [backup, setBackup] = useState<DiveLogBackup | null>(null);
  const [existingDiveSites, setExistingDiveSites] = useState<DiveSite[]>([]);
  const [restoreDivesEnabled, setRestoreDivesEnabled] = useState(true);
  const [restoreSitesEnabled, setRestoreSitesEnabled] = useState(true);
  const [restoreSettingsEnabled, setRestoreSettingsEnabled] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const divePlan = useMemo(
    () => planDiveRestore(backup?.data.dives ?? [], dives),
    [backup, dives],
  );
  const sitePlan = useMemo(
    () => planDiveSiteRestore(backup?.data.diveSites ?? [], existingDiveSites),
    [backup, existingDiveSites],
  );
  const effectiveCsvScope = csvScope === 'filtered' && hasActiveFilters ? 'filtered' : 'all';
  const selectedCsvDives = effectiveCsvScope === 'filtered' ? filteredDives : dives;
  const hasRestoreWork = Boolean(
    backup && (
      (restoreDivesEnabled && divePlan.dives.length > 0)
      || (restoreSitesEnabled && sitePlan.diveSites.length > 0)
      || restoreSettingsEnabled
    ),
  );

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleDownloadBackup = async () => {
    resetMessages();
    setIsWorking(true);
    try {
      const diveSites = await loadDiveSites();
      const exportBackup = createDiveLogBackup(dives, diveSites, settings);
      downloadTextFile(
        serializeDiveLogBackup(exportBackup),
        datedExportFilename('backup', 'json'),
        'application/json;charset=utf-8',
      );
      setSuccess(`Downloaded a complete backup with ${dives.length} dive${dives.length === 1 ? '' : 's'} and ${diveSites.length} site${diveSites.length === 1 ? '' : 's'}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The backup could not be created.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleDownloadCsv = () => {
    resetMessages();
    downloadTextFile(
      divesToCsv(selectedCsvDives),
      datedExportFilename('dives', 'csv'),
      'text/csv;charset=utf-8',
    );
    setSuccess(`Downloaded ${selectedCsvDives.length} dive${selectedCsvDives.length === 1 ? '' : 's'} as CSV.`);
  };

  const handleRestoreFile = async (file: File) => {
    resetMessages();
    setBackup(null);
    if (file.size === 0) {
      setError('Backup file is empty.');
      return;
    }
    if (file.size > MAX_BACKUP_BYTES) {
      setError('Backup file exceeds the 50 MB limit.');
      return;
    }

    setIsWorking(true);
    try {
      const parsed = parseDiveLogBackup(await file.text());
      const currentSites = await loadDiveSites();
      setExistingDiveSites(currentSites);
      setBackup(parsed);
      setRestoreDivesEnabled(true);
      setRestoreSitesEnabled(true);
      setRestoreSettingsEnabled(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The backup could not be read.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleRestore = async () => {
    if (!backup || !hasRestoreWork) return;
    resetMessages();
    setIsWorking(true);
    try {
      if (restoreSitesEnabled && sitePlan.diveSites.length > 0) {
        await restoreDiveSites(sitePlan.diveSites);
      }
      if (restoreDivesEnabled && divePlan.dives.length > 0) {
        await restoreDives(divePlan.dives);
      }
      if (restoreSettingsEnabled) {
        await restoreSettings(backup.data.settings);
      }

      const restored: string[] = [];
      if (restoreDivesEnabled) restored.push(`${divePlan.dives.length} dive${divePlan.dives.length === 1 ? '' : 's'}`);
      if (restoreSitesEnabled) restored.push(`${sitePlan.diveSites.length} site${sitePlan.diveSites.length === 1 ? '' : 's'}`);
      if (restoreSettingsEnabled) restored.push('settings');
      setSuccess(`Restore complete: ${restored.join(', ')}.`);
      setBackup(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The backup could not be restored.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isWorking && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5" />
            Backup &amp; Export
          </DialogTitle>
          <DialogDescription>
            Keep a complete, restorable copy of your logbook or export dives for a spreadsheet.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Complete JSON backup</h3>
            <p className="mt-1 text-sm text-slate-600">
              Includes all dives, profile samples, equipment, conditions, dive sites, and settings.
            </p>
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => void handleDownloadBackup()}
              disabled={isWorking}
            >
              <Download className="mr-2 h-4 w-4" />
              Download backup
            </Button>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Spreadsheet CSV</h3>
            <p className="mt-1 text-sm text-slate-600">
              Exports metric source values, with profile and equipment data in JSON columns.
            </p>
            <label className="mt-3 block text-sm font-medium text-slate-700" htmlFor="csv-scope">
              Dives to export
            </label>
            <select
              id="csv-scope"
              value={effectiveCsvScope}
              onChange={(event) => setCsvScope(event.target.value as 'all' | 'filtered')}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="all">All dives ({dives.length})</option>
              {hasActiveFilters && (
                <option value="filtered">Filtered results ({filteredDives.length})</option>
              )}
            </select>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={handleDownloadCsv}
              disabled={isWorking}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Restore a JSON backup</h3>
              <p className="mt-1 text-sm text-slate-600">
                The file is validated and existing dives and sites are skipped automatically.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleRestoreFile(file);
                event.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isWorking}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose backup
            </Button>
          </div>

          {backup && (
            <div className="mt-4 rounded-md bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                Backup from {new Date(backup.createdAt).toLocaleString()}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={restoreDivesEnabled}
                    onChange={(event) => setRestoreDivesEnabled(event.target.checked)}
                  />
                  <span>
                    Restore {divePlan.dives.length} new dive{divePlan.dives.length === 1 ? '' : 's'}
                    {divePlan.duplicateCount > 0 && ` (${divePlan.duplicateCount} duplicate${divePlan.duplicateCount === 1 ? '' : 's'} skipped)`}
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={restoreSitesEnabled}
                    onChange={(event) => setRestoreSitesEnabled(event.target.checked)}
                  />
                  <span>
                    Restore {sitePlan.diveSites.length} new dive site{sitePlan.diveSites.length === 1 ? '' : 's'}
                    {sitePlan.duplicateCount > 0 && ` (${sitePlan.duplicateCount} duplicate${sitePlan.duplicateCount === 1 ? '' : 's'} skipped)`}
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={restoreSettingsEnabled}
                    onChange={(event) => setRestoreSettingsEnabled(event.target.checked)}
                  />
                  <span>Restore display and diving settings</span>
                </label>
              </div>
            </div>
          )}
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isWorking}>
            Close
          </Button>
          {backup && (
            <Button type="button" onClick={() => void handleRestore()} disabled={isWorking || !hasRestoreWork}>
              {isWorking ? 'Restoring...' : 'Restore selected data'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataTransferDialog;

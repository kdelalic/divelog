import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Dive } from '@/lib/dives';
import { parseDiveImportFile, type DiveImportResult } from '@/lib/diveImportParser';
import type { ImportedDiveSite } from '@/lib/subsurfaceXmlParser';
import useSettingsStore from '@/store/settingsStore';
import { formatDepth } from '@/lib/unitConversions';
import { formatDiveDateTime } from '@/lib/dateHelpers';

interface DiveImportProps {
  onImportDives: (dives: Dive[]) => void | Promise<void>;
  onImportSites: (sites: ImportedDiveSite[]) => void | Promise<void>;
}

const DiveImport = ({ onImportDives, onImportSites }: DiveImportProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<DiveImportResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useSettingsStore();

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      const result = await parseDiveImportFile(file);
      const count = result.kind === 'dives' ? result.dives.length : result.sites.length;
      if (count === 0) throw new Error(`No valid ${result.kind} found in ${result.label}.`);
      setImportResult(result);
      setIsPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFileSelect(file);
    // Allow selecting the same file again after cancelling or correcting an error.
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  };

  const handleConfirmImport = async () => {
    if (!importResult) return;
    setIsUploading(true);
    setError(null);
    try {
      if (importResult.kind === 'dives') {
        await onImportDives(importResult.dives);
      } else {
        await onImportSites(importResult.sites);
      }
      setIsPreviewOpen(false);
      setImportResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import could not be saved');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelImport = () => {
    setIsPreviewOpen(false);
    setImportResult(null);
  };

  const importCount = importResult?.kind === 'dives'
    ? importResult.dives.length
    : importResult?.sites.length ?? 0;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Dive Data
          </CardTitle>
          <CardDescription>
            Upload dive data from your dive computer, Subsurface, or other diving software
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/50'
                : 'border-input hover:border-muted-foreground'
            }`}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".uddf,.csv,.xml,.ssrf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {dragActive ? 'Drop your file here' : 'Drop your file here or click to browse'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports UDDF, Subsurface XML/SSRF, CSV, and dive-site XML exports
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-4"
            >
              {isUploading ? 'Processing...' : 'Choose File'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium">Import Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            <p><strong>Dives:</strong> UDDF, native Subsurface XML/SSRF, summary CSV, and profile CSV</p>
            <p><strong>Sites:</strong> Standalone Subsurface dive-sites XML</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              {importResult?.kind === 'dives'
                ? `Found ${importCount} dive${importCount === 1 ? '' : 's'} in ${importResult.label}`
                : importResult?.kind === 'sites'
                  ? `Found ${importCount} dive site${importCount === 1 ? '' : 's'} in ${importResult.label}`
                  : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 py-4">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="space-y-2 pr-2">
              {importResult?.kind === 'dives' && importResult.dives.map((dive, index) => (
                <div key={index} className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{dive.location}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDiveDateTime(dive.datetime, settings)} • {formatDepth(dive.depth, settings.units.depth)} • {dive.duration}min
                      {dive.buddy && ` • with ${dive.buddy}`}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">#{index + 1}</div>
                </div>
              ))}
              {importResult?.kind === 'sites' && importResult.sites.map((site, index) => (
                <div
                  key={`${site.name}-${index}`}
                  className="flex items-center justify-between rounded-md border bg-muted/50 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{site.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">#{index + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={handleCancelImport} disabled={isUploading} size="lg" className="px-6">
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmImport()}
                disabled={isUploading || !importResult}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                {isUploading
                  ? 'Importing...'
                  : `Import ${importCount} ${importResult?.kind === 'sites' ? 'Site' : 'Dive'}${importCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DiveImport;

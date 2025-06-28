import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
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
import { parseUDDFFile, validateUDDFFile, getUDDFImportSummary, UDDFParseError } from '@/lib/uddfParser';
import type { Dive } from '@/lib/dives';

interface UDDFImportProps {
  onImport: (dives: Dive[]) => void;
}

const UDDFImport = ({ onImport }: UDDFImportProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewDives, setPreviewDives] = useState<Dive[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      // Validate file
      if (!validateUDDFFile(file)) {
        throw new Error('Invalid UDDF file. Please ensure it has a .uddf extension and is not empty.');
      }

      // Parse file
      const parsedDives = await parseUDDFFile(file);
      
      if (parsedDives.length === 0) {
        throw new Error('No valid dives found in the UDDF file.');
      }

      setPreviewDives(parsedDives);
      setIsPreviewOpen(true);
    } catch (err) {
      if (err instanceof UDDFParseError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleConfirmImport = () => {
    onImport(previewDives);
    setIsPreviewOpen(false);
    setPreviewDives([]);
  };

  const handleCancelImport = () => {
    setIsPreviewOpen(false);
    setPreviewDives([]);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import UDDF File
          </CardTitle>
          <CardDescription>
            Upload a UDDF (.uddf) file from your dive computer or diving software to import your dives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".uddf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {dragActive ? 'Drop your UDDF file here' : 'Drop your UDDF file here or click to browse'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports UDDF files from Subsurface, dive computers, and other diving software
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
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Import Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            <p>UDDF (Universal Dive Data Format) is the standard format for dive data exchange.</p>
            <p>Compatible with Subsurface, dive computers from major manufacturers, and most diving software.</p>
          </div>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              {getUDDFImportSummary(previewDives)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {previewDives.map((dive, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium">{dive.location}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(dive.date).toLocaleDateString()} • {dive.depth}m • {dive.duration}min
                      {dive.buddy && ` • with ${dive.buddy}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelImport}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>
              Import {previewDives.length} Dive{previewDives.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UDDFImport;
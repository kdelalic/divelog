import type { Dive } from './dives';
import { parseSubsurfaceCSV } from './subsurfaceCsvParser';
import { parseSubsurfaceProfileCSV } from './subsurfaceProfileCsvParser';
import {
  parseSubsurfaceDiveSitesXML,
  parseSubsurfaceXML,
  type ImportedDiveSite,
} from './subsurfaceXmlParser';
import { parseUDDFFile } from './uddfParser';

export type DiveImportFormat =
  | 'uddf'
  | 'subsurface-xml'
  | 'subsurface-csv'
  | 'subsurface-profile-csv'
  | 'subsurface-divesites';

export type DiveImportResult =
  | { kind: 'dives'; format: DiveImportFormat; label: string; dives: Dive[] }
  | { kind: 'sites'; format: 'subsurface-divesites'; label: string; sites: ImportedDiveSite[] };

export class DiveImportParseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'DiveImportParseError';
  }
}

const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

export const parseDiveImportFile = async (file: File): Promise<DiveImportResult> => {
  if (file.size === 0) throw new DiveImportParseError('Import file is empty');
  if (file.size > MAX_IMPORT_BYTES) throw new DiveImportParseError('Import file exceeds the 50 MB limit');

  const text = await file.text();
  const start = text.replace(/^\uFEFF/, '').trimStart();
  const rootStart = start.replace(/^<\?xml[^>]*>\s*/i, '');

  try {
    if (/^<uddf\b/i.test(rootStart)) {
      const dives = await parseUDDFFile(file);
      return { kind: 'dives', format: 'uddf', label: 'UDDF', dives };
    }
    if (/^<divelog\b/i.test(rootStart)) {
      return {
        kind: 'dives',
        format: 'subsurface-xml',
        label: 'Subsurface XML/SSRF',
        dives: parseSubsurfaceXML(text),
      };
    }
    if (/^<divesites\b/i.test(rootStart)) {
      return {
        kind: 'sites',
        format: 'subsurface-divesites',
        label: 'Subsurface dive sites',
        sites: parseSubsurfaceDiveSitesXML(text),
      };
    }

    const header = start.split(/\r?\n/, 1)[0].toLowerCase();
    if (header.includes('sample time (min)') && header.includes('sample depth (m)')) {
      return {
        kind: 'dives',
        format: 'subsurface-profile-csv',
        label: 'Subsurface dive-computer profile CSV',
        dives: parseSubsurfaceProfileCSV(text),
      };
    }
    if (header.includes('dive number') && header.includes('maxdepth [m]')) {
      return {
        kind: 'dives',
        format: 'subsurface-csv',
        label: 'Subsurface summary CSV',
        dives: parseSubsurfaceCSV(text),
      };
    }
  } catch (error) {
    throw new DiveImportParseError(
      error instanceof Error ? error.message : 'Failed to parse import file',
      error,
    );
  }

  throw new DiveImportParseError(
    'Unsupported file contents. Expected UDDF, Subsurface XML/SSRF, Subsurface CSV, or dive-sites XML.',
  );
};

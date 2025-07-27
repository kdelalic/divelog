import { XMLParser } from 'fast-xml-parser';
import type { Dive, DiveSample } from './dives';

interface UDDFSite {
  '@_id': string;
  name: string;
  geography?: {
    location?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
}

interface UDDFDivesite {
  site: UDDFSite | UDDFSite[];
}

interface UDDFDive {
  '@_id': string;
  informationbeforedive?: {
    divenumber?: number;
    datetime?: string;
    divestatus?: string;
    link?: {
      '@_ref': string;
    };
  };
  informationafterdive?: {
    greatestdepth?: number;
    diveduration?: number;
    buddy?: {
      personal?: {
        firstname?: string;
        lastname?: string;
      };
    }[];
  };
  samples?: {
    waypoint?: Array<{
      divetime?: number;
      depth?: number;
      temperature?: number;
      tankpressure?: number;
      setpo2?: number;
      cns?: number;
      ndl?: number;
      stoptime?: number;
      stopdepth?: number;
    }>;
  };
}

interface UDDFRepetitiongroup {
  dive: UDDFDive | UDDFDive[];
}

interface UDDFProfiledata {
  repetitiongroup: UDDFRepetitiongroup | UDDFRepetitiongroup[];
}

interface UDDFDivetrip {
  name?: string;
  trippart?: {
    divesite?: UDDFDivesite;
  };
}

interface UDDFRoot {
  uddf: {
    profiledata?: UDDFProfiledata;
    divetrip?: UDDFDivetrip | UDDFDivetrip[];
    divesite?: UDDFDivesite;
  };
}

export class UDDFParseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'UDDFParseError';
  }
}

export const parseUDDFFile = async (file: File): Promise<Dive[]> => {
  try {
    const text = await file.text();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
    });

    const result = parser.parse(text) as UDDFRoot;
    
    console.log('Parsed UDDF structure:', result);
    
    if (!result.uddf) {
      throw new UDDFParseError('Invalid UDDF file: missing uddf root element');
    }

    const dives: Dive[] = [];
    let diveIdCounter = 1;

    // Extract dive sites information
    const diveSites = new Map<string, UDDFSite>();
    
    // Parse dive sites from the main divesite section
    if (result.uddf.divesite) {
      const sites = Array.isArray(result.uddf.divesite.site) 
        ? result.uddf.divesite.site 
        : [result.uddf.divesite.site];
      
      sites.forEach(site => {
        if (site && site['@_id']) {
          diveSites.set(site['@_id'], site);
        }
      });
    }

    // Also check divetrip for additional sites (fallback)
    if (result.uddf.divetrip) {
      const trips = Array.isArray(result.uddf.divetrip) 
        ? result.uddf.divetrip 
        : [result.uddf.divetrip];
      
      trips.forEach(trip => {
        if (trip.trippart?.divesite?.site) {
          const sites = Array.isArray(trip.trippart.divesite.site) 
            ? trip.trippart.divesite.site 
            : [trip.trippart.divesite.site];
          
          sites.forEach(site => {
            if (site && site['@_id']) {
              diveSites.set(site['@_id'], site);
            }
          });
        }
      });
    }

    // Parse profile data
    if (result.uddf.profiledata) {
      const repetitionGroups = Array.isArray(result.uddf.profiledata.repetitiongroup)
        ? result.uddf.profiledata.repetitiongroup
        : [result.uddf.profiledata.repetitiongroup];

      repetitionGroups.forEach(group => {
        const groupDives = Array.isArray(group.dive) ? group.dive : [group.dive];
        
        groupDives.forEach(uddfDive => {
          try {
            console.log('Processing dive:', uddfDive);
            const dive = parseUDDFDive(uddfDive, diveIdCounter++, diveSites);
            if (dive) {
              dives.push(dive);
            }
          } catch (error) {
            console.warn('Failed to parse individual dive:', error);
          }
        });
      });
    }

    return dives;
  } catch (error) {
    if (error instanceof UDDFParseError) {
      throw error;
    }
    throw new UDDFParseError(
      'Failed to parse UDDF file: ' + (error instanceof Error ? error.message : 'Unknown error'),
      error
    );
  }
};

const parseUDDFDive = (
  uddfDive: UDDFDive, 
  id: number, 
  diveSites: Map<string, UDDFSite>
): Dive | null => {
  const beforeDive = uddfDive.informationbeforedive;
  const afterDive = uddfDive.informationafterdive;

  // Extract basic dive information
  const datetime = beforeDive?.datetime 
    ? parseUDDFDateTime(beforeDive.datetime)
    : new Date().toISOString();

  const depth = Number(afterDive?.greatestdepth) || 0;
  const durationSeconds = Number(afterDive?.diveduration) || 0;
  const duration = Math.round(durationSeconds / 60); // Convert seconds to minutes

  // Extract buddy information
  let buddy = '';
  if (afterDive?.buddy && Array.isArray(afterDive.buddy)) {
    const buddyInfo = afterDive.buddy[0]?.personal;
    if (buddyInfo) {
      buddy = `${buddyInfo.firstname || ''} ${buddyInfo.lastname || ''}`.trim();
    }
  }

  // Find the dive site for this dive using the link reference
  let location = 'Unknown Location';
  let lat = 0;
  let lng = 0;

  const siteRef = beforeDive?.link?.['@_ref'];
  if (siteRef && diveSites.has(siteRef)) {
    const site = diveSites.get(siteRef)!;
    location = site.name || `Site ${siteRef}`;
    lat = Number(site.geography?.latitude) || 0;
    lng = Number(site.geography?.longitude) || 0;
  } else if (diveSites.size > 0) {
    // Fallback to first site if no specific link found
    const firstSite = diveSites.values().next().value;
    if (firstSite) {
      location = firstSite.name || location;
      lat = Number(firstSite.geography?.latitude) || 0;
      lng = Number(firstSite.geography?.longitude) || 0;
    }
  }

  // Extract dive profile samples
  let samples: DiveSample[] | undefined;
  console.log('Checking samples for dive:', { 
    hasSamples: !!uddfDive.samples, 
    hasWaypoint: !!uddfDive.samples?.waypoint,
    samplesStructure: uddfDive.samples 
  });
  
  if (uddfDive.samples?.waypoint) {
    const waypoints = Array.isArray(uddfDive.samples.waypoint) 
      ? uddfDive.samples.waypoint 
      : [uddfDive.samples.waypoint];
    
    samples = waypoints
      .filter(wp => wp.divetime !== undefined && wp.depth !== undefined)
      .map(wp => ({
        time: Number(wp.divetime!), // Ensure time is a number
        depth: Number(wp.depth!), // Ensure depth is a number
        temperature: wp.temperature !== undefined ? Number(wp.temperature) : undefined, // Convert to number if present
        pressure: wp.tankpressure !== undefined ? Number(wp.tankpressure) : undefined, // Convert to number if present
      }))
      .sort((a, b) => a.time - b.time); // Sort by time
    
    // Only include samples if we have meaningful data
    if (samples.length === 0) {
      samples = undefined;
    } else {
      console.log(`Extracted ${samples.length} dive samples for dive ${id}`);
    }
  }

  // Validation: skip dives with no meaningful data
  if (depth === 0 && duration === 0) {
    return null;
  }

  return {
    id,
    datetime,
    location,
    depth: Math.round(depth * 10) / 10, // Round to 1 decimal place
    duration, // Already converted from seconds to minutes and rounded
    buddy: buddy || undefined,
    lat,
    lng,
    samples,
  };
};

const parseUDDFDateTime = (dateString: string): string => {
  try {
    // UDDF dates can be in various formats, commonly ISO 8601
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    return date.toISOString();
  } catch {
    // Fallback to current date if parsing fails
    return new Date().toISOString();
  }
};

export const validateUDDFFile = (file: File): boolean => {
  // Basic validation
  if (!file.name.toLowerCase().endsWith('.uddf')) {
    return false;
  }
  
  if (file.size === 0) {
    return false;
  }
  
  // Size limit: 10MB
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  
  return true;
};

export const getUDDFImportSummary = (dives: Dive[]): string => {
  if (dives.length === 0) {
    return 'No valid dives found in UDDF file';
  }
  
  const locations = new Set(dives.map(dive => dive.location));
  const dateRange = dives.length > 1 
    ? `${new Date(dives[0].datetime).toLocaleDateString()} to ${new Date(dives[dives.length - 1].datetime).toLocaleDateString()}`
    : new Date(dives[0].datetime).toLocaleDateString();
  
  return `Found ${dives.length} dive${dives.length === 1 ? '' : 's'} from ${locations.size} location${locations.size === 1 ? '' : 's'} (${dateRange})`;
};
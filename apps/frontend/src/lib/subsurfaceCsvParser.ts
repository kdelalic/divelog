import type { Dive, Equipment, Tank, GasMix } from './dives';

export interface SubsurfaceCSVRow {
  'dive number': string;
  'date': string;
  'time': string;
  'duration [min]': string;
  'sac [l/min]': string;
  'maxdepth [m]': string;
  'avgdepth [m]': string;
  'mode': string;
  'airtemp [C]': string;
  'watertemp [C]': string;
  'cylinder size (1) [l]': string;
  'startpressure (1) [bar]': string;
  'endpressure (1) [bar]': string;
  'o2 (1) [%]': string;
  'he (1) [%]': string;
  'location': string;
  'gps': string;
  'divemaster': string;
  'buddy': string;
  'suit': string;
  'rating': string;
  'visibility': string;
  'notes': string;
  'weight [kg]': string;
  'tags': string;
}

export class SubsurfaceCSVParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubsurfaceCSVParseError';
  }
}

export function parseSubsurfaceCSV(csvText: string): Dive[] {
  const records = parseCSVRecords(csvText);

  if (records.length < 2) {
    throw new SubsurfaceCSVParseError('CSV file must contain at least a header and one data row');
  }

  // Parse header
  const headers = records[0].filter(h => h.trim() !== ''); // Remove empty headers
  
  
  // Validate that this looks like a Subsurface CSV
  const requiredHeaders = ['dive number', 'date', 'time', 'duration [min]', 'maxdepth [m]', 'location'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  
  if (missingHeaders.length > 0) {
    throw new SubsurfaceCSVParseError(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const dives: Dive[] = [];
  
  // Parse data rows
  for (let i = 1; i < records.length; i++) {
    try {
      const values = records[i].filter((_, index) => index < headers.length); // Only take as many values as headers
      if (values.every(value => value.trim() === '')) continue;
      if (values.length < headers.length) {
        // Pad with empty strings if we have fewer values than headers
        while (values.length < headers.length) {
          values.push('');
        }
      }
      
      // Create row object
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      const dive = parseSubsurfaceCSVRow(row as unknown as SubsurfaceCSVRow);
      if (dive) {
        dives.push(dive);
      }
    } catch (error) {
      console.warn(`Error parsing row ${i + 1}:`, error);
      // Continue parsing other rows
    }
  }
  
  if (dives.length === 0) {
    throw new SubsurfaceCSVParseError('No valid dives found in CSV file');
  }
  
  return dives;
}

export function parseCSVRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      record.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      record.push(field.trim());
      field = '';
      if (record.some(value => value.length > 0)) records.push(record);
      record = [];
      if (char === '\r' && csvText[i + 1] === '\n') i++;
    } else {
      field += char;
    }
    i++;
  }

  record.push(field.trim());
  if (record.some(value => value.length > 0)) records.push(record);
  return records;
}

function parseSubsurfaceCSVRow(row: SubsurfaceCSVRow): Dive | null {
  try {
    // Parse date and time
    const dateStr = row.date?.trim();
    const timeStr = row.time?.trim();
    
    if (!dateStr || !timeStr) {
      throw new Error(`Missing date or time: date="${dateStr}", time="${timeStr}"`);
    }
    
    // Combine date and time (Subsurface format: YYYY-MM-DD and HH:MM:SS).
    // These are wall-clock times at the dive site, so no timezone is attached.
    const datetime = `${dateStr}T${timeStr}`;
    
    // Parse location
    const location = row.location?.trim();
    if (!location) {
      throw new Error('Missing location');
    }
    
    // Parse depth (maxdepth is the main depth value)
    const depthStr = row['maxdepth [m]']?.trim();
    if (!depthStr || depthStr === '') {
      throw new Error('Missing depth');
    }
    const depth = parseFloat(depthStr);
    if (isNaN(depth) || depth <= 0) {
      throw new Error('Invalid depth');
    }
		const parsedMeanDepth = parseFloat(row['avgdepth [m]']?.trim() || '');
		const mode = row.mode?.trim().toLocaleLowerCase();
		const diveMode: Dive['diveMode'] = mode === 'oc' || mode === 'open circuit' ? 'OC'
			: mode === 'freedive' || mode === 'apnea' ? 'freedive'
			: mode === 'ccr' ? 'CCR'
			: mode === 'pscr' ? 'pSCR'
			: undefined;
    
    // Parse duration
    const durationStr = row['duration [min]']?.trim();
    if (!durationStr || durationStr === '') {
      throw new Error('Missing duration');
    }
    
    // Duration might be in MM:SS or just minutes
    let duration: number;
    if (durationStr.includes(':')) {
      const [minutes, seconds] = durationStr.split(':').map(s => parseInt(s.trim(), 10));
      duration = minutes + (seconds || 0) / 60;
    } else {
      duration = parseFloat(durationStr);
    }
    
    if (isNaN(duration) || duration <= 0) {
      throw new Error('Invalid duration');
    }
    
    // Round duration to integer for backend compatibility
    duration = Math.round(duration);
    
    // Parse GPS coordinates
    let lat = 0, lng = 0;
    const gpsStr = row.gps?.trim();
    if (gpsStr) {
      const gpsMatch = gpsStr.match(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/);
      if (gpsMatch) {
        lat = parseFloat(gpsMatch[1]);
        lng = parseFloat(gpsMatch[2]);
      }
    }
    
    // Parse buddy
    const buddy = row.buddy?.trim() || undefined;
    
    // Create equipment if tank data is available
    let equipment: Equipment | undefined;
    const cylinderSize = parseFloat(row['cylinder size (1) [l]']?.trim() || '0');
    const startPressure = parseFloat(row['startpressure (1) [bar]']?.trim() || '0');
    const endPressure = parseFloat(row['endpressure (1) [bar]']?.trim() || '0');
    const o2Percent = parseFloat(row['o2 (1) [%]']?.trim() || '21');
    const hePercent = parseFloat(row['he (1) [%]']?.trim() || '0');
    
    if (cylinderSize > 0) {
      // Create gas mix
      const gasMix: GasMix = {
        oxygen: isNaN(o2Percent) ? 21 : o2Percent,
        helium: isNaN(hePercent) ? 0 : hePercent,
        nitrogen: 100 - (isNaN(o2Percent) ? 21 : o2Percent) - (isNaN(hePercent) ? 0 : hePercent)
      };
      
      // Determine gas mix name
      if (gasMix.helium && gasMix.helium > 0) {
        gasMix.name = `Trimix ${gasMix.oxygen}/${gasMix.helium}`;
      } else if (gasMix.oxygen !== 21) {
        gasMix.name = `EANx${gasMix.oxygen}`;
      } else {
        gasMix.name = 'Air';
      }
      
      const tank: Tank = {
        name: 'Main Tank',
        size: cylinderSize,
        working_pressure: isNaN(startPressure) ? 232 : Math.max(startPressure, endPressure, 200), // Reasonable default
        start_pressure: isNaN(startPressure) ? 200 : startPressure,
        end_pressure: isNaN(endPressure) ? 50 : endPressure,
        gas_mix: gasMix,
        material: 'steel'
      };
      
      equipment = {
        tanks: [tank],
        bcd: '',
        regulator: '',
        wetsuit: {
          type: row.suit?.trim() ? 'wetsuit' : 'none',
          thickness: undefined,
          material: row.suit?.trim() || ''
        },
        weights: parseFloat(row['weight [kg]']?.trim() || '0') || undefined,
        fins: '',
        mask: '',
        computer: '',
        notes: ''
      };
    }
    
    // Parse conditions
    const airTemp = parseFloat(row['airtemp [C]']?.trim() || '0');
    const waterTemp = parseFloat(row['watertemp [C]']?.trim() || '0');
    const visibility = parseFloat(row.visibility?.trim() || '0');
    
    const conditions = (airTemp > 0 || waterTemp > 0 || visibility > 0) ? {
      airTemp: airTemp > 0 ? airTemp : undefined,
      waterTemp: waterTemp > 0 ? {
        surface: waterTemp,
        bottom: waterTemp
      } : undefined,
      visibility: visibility > 0 ? visibility : undefined
    } : undefined;
    
    // Parse rating
    const ratingStr = row.rating?.trim();
    const rating = ratingStr && !isNaN(parseFloat(ratingStr)) ? parseFloat(ratingStr) : undefined;
		const parsedDiveNumber = Number(row['dive number']);
		const tags = row.tags?.split(',').map((tag) => tag.trim()).filter(Boolean);
    
    // Create dive object
    const dive: Dive = {
      id: 0, // Will be assigned by the store
			diveNumber: Number.isInteger(parsedDiveNumber) && parsedDiveNumber > 0 ? parsedDiveNumber : undefined,
			tags: tags?.length ? tags : undefined,
      datetime,
      location,
      depth,
			meanDepth: Number.isFinite(parsedMeanDepth) && parsedMeanDepth >= 0 && parsedMeanDepth <= depth ? parsedMeanDepth : undefined,
      duration,
      buddy,
      lat,
      lng,
      equipment,
      conditions,
      rating,
      notes: row.notes?.trim() || undefined,
			diveType: 'recreational', // Default purpose for CSV imports
			diveMode,
    };
    
    return dive;
    
  } catch (error) {
    console.warn('Failed to parse CSV row:', error);
    return null;
  }
}

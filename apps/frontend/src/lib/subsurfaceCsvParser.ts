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
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    throw new SubsurfaceCSVParseError('CSV file must contain at least a header and one data row');
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).filter(h => h.trim() !== ''); // Remove empty headers
  
  
  // Validate that this looks like a Subsurface CSV
  const requiredHeaders = ['dive number', 'date', 'time', 'duration [min]', 'maxdepth [m]', 'location'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  
  if (missingHeaders.length > 0) {
    throw new SubsurfaceCSVParseError(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const dives: Dive[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    try {
      const values = parseCSVRow(line).filter((_, index) => index < headers.length); // Only take as many values as headers
      if (values.length < headers.length) {
        // Pad with empty strings if we have fewer values than headers
        while (values.length < headers.length) {
          values.push('');
        }
      }
      
      // Create row object
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      const dive = parseSubsurfaceCSVRow(row as SubsurfaceCSVRow);
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

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

function parseSubsurfaceCSVRow(row: SubsurfaceCSVRow): Dive | null {
  try {
    // Parse date and time
    const dateStr = row.date?.trim();
    const timeStr = row.time?.trim();
    
    if (!dateStr || !timeStr) {
      throw new Error(`Missing date or time: date="${dateStr}", time="${timeStr}"`);
    }
    
    // Combine date and time (Subsurface format: YYYY-MM-DD and HH:MM:SS)
    const datetime = `${dateStr}T${timeStr}.000Z`;
    
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
    
    // Create dive object
    const dive: Dive = {
      id: 0, // Will be assigned by the store
      datetime,
      location,
      depth,
      duration,
      buddy,
      lat,
      lng,
      equipment,
      conditions,
      rating,
      notes: row.notes?.trim() || undefined,
      diveType: 'recreational' // Default for CSV imports
    };
    
    return dive;
    
  } catch (error) {
    console.warn('Failed to parse CSV row:', error);
    return null;
  }
}
import type { Dive, DiveSample } from './dives';
import { parseCSVRecords } from './subsurfaceCsvParser';

export class SubsurfaceProfileCSVParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubsurfaceProfileCSVParseError';
  }
}

const REQUIRED_HEADERS = [
  'dive number',
  'date',
  'time',
  'sample time (min)',
  'sample depth (m)',
];

const parseSampleTime = (value: string): number | undefined => {
  const clock = /^(\d+):(\d{1,2})$/.exec(value.trim());
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes * 60) : undefined;
};

export const parseSubsurfaceProfileCSV = (csvText: string): Dive[] => {
  const records = parseCSVRecords(csvText);
  if (records.length < 2) {
    throw new SubsurfaceProfileCSVParseError('Profile CSV must contain a header and sample rows');
  }

  const headers = records[0].map(header => header.trim());
  const missing = REQUIRED_HEADERS.filter(header => !headers.includes(header));
  if (missing.length > 0) {
    throw new SubsurfaceProfileCSVParseError(`Missing required profile headers: ${missing.join(', ')}`);
  }

  const groups = new Map<string, { date: string; time: string; number: number; samples: DiveSample[] }>();
  records.slice(1).forEach(values => {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']));
    const date = row.date;
    const time = row.time;
    const diveNumber = Number(row['dive number']);
    const sampleTime = parseSampleTime(row['sample time (min)']);
    const depth = Number(row['sample depth (m)']);
    if (!date || !time || sampleTime === undefined || !Number.isFinite(depth) || depth < 0) return;

    const key = `${row['dive number']}|${date}|${time}`;
    const group = groups.get(key) ?? {
      date,
      time,
      number: Number.isFinite(diveNumber) ? diveNumber : groups.size + 1,
      samples: [],
    };
    const temperature = Number(row['sample temperature (C)']);
    const pressure = Number(row['sample pressure (bar)']);
    group.samples.push({
      time: sampleTime,
      depth,
      temperature: row['sample temperature (C)'] && Number.isFinite(temperature) ? temperature : undefined,
      pressure: row['sample pressure (bar)'] && Number.isFinite(pressure) ? pressure : undefined,
    });
    groups.set(key, group);
  });

  const dives = [...groups.values()].map(group => {
    group.samples.sort((a, b) => a.time - b.time);
    const maxDepth = group.samples.reduce((max, sample) => Math.max(max, sample.depth), 0);
    // Subsurface excludes long surface intervals from dive duration. Its
    // exported fixture uses roughly 0.8 m as the wet/dry boundary.
    const activeSeconds = group.samples.slice(1).reduce((total, sample, index) => {
      const previous = group.samples[index];
      return sample.depth >= 0.8 || previous.depth >= 0.8
        ? total + Math.max(0, sample.time - previous.time)
        : total;
    }, 0);
    return {
      id: group.number,
      datetime: `${group.date}T${group.time}`,
      location: 'Unknown Location',
      depth: Math.round(maxDepth * 100) / 100,
      duration: Math.max(1, Math.round(activeSeconds / 60)),
      lat: 0,
      lng: 0,
      samples: group.samples,
    } satisfies Dive;
  }).filter(dive => dive.depth > 0 || dive.duration > 0);

  if (dives.length === 0) {
    throw new SubsurfaceProfileCSVParseError('No valid dive profiles found in CSV file');
  }
  return dives;
};

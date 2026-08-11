import * as z from 'zod';
import type { Dive } from './dives';
import type { Trip } from './dives';
import type { UserSettings } from './settings';
import type { DiveSite } from './api';

export const BACKUP_FORMAT = 'subsurface-web-backup' as const;
export const BACKUP_VERSION = 2 as const;
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export type BackupDive = Omit<Dive, 'id'>;
export type BackupDiveSite = Pick<DiveSite, 'name' | 'latitude' | 'longitude' | 'description'>;
export type BackupTrip = Omit<Trip, 'id' | 'diveCount'>;

export interface DiveLogBackup {
  format: typeof BACKUP_FORMAT;
	version: 1 | typeof BACKUP_VERSION;
  createdAt: string;
  data: {
    dives: BackupDive[];
    diveSites: BackupDiveSite[];
    settings: UserSettings;
		trips: BackupTrip[];
		tags: string[];
  };
}

const finiteNumber = z.number().finite();
const optionalText = (maximum: number) => z.string().max(maximum).optional();

const diveSampleSchema = z.object({
  time: z.number().int().min(0),
  depth: finiteNumber.min(0).max(999.99),
  temperature: finiteNumber.min(-273.15).max(100).optional(),
  pressure: finiteNumber.min(0).max(1000).optional(),
});

const gasMixSchema = z.object({
  oxygen: z.number().int().min(1).max(100),
  helium: z.number().int().min(0).max(100).optional(),
  nitrogen: z.number().int().min(0).max(100).optional(),
  name: optionalText(100),
}).refine((gas) => gas.oxygen + (gas.helium ?? 0) <= 100, {
  message: 'oxygen and helium percentages must total at most 100',
});

const tankSchema = z.object({
  id: z.number().int().positive().optional(),
  name: optionalText(255),
  size: finiteNumber.positive().max(1000),
  working_pressure: finiteNumber.positive().max(1000),
  start_pressure: finiteNumber.min(0).max(1000),
  end_pressure: finiteNumber.min(0).max(1000),
  gas_mix: gasMixSchema,
  material: z.enum(['steel', 'aluminum']).optional(),
}).refine((tank) => tank.end_pressure <= tank.start_pressure, {
  path: ['end_pressure'],
  message: 'must not exceed start_pressure',
});

const equipmentSchema = z.object({
  tanks: z.array(tankSchema),
  bcd: optionalText(255),
  regulator: optionalText(255),
  wetsuit: z.object({
    type: z.enum(['wetsuit', 'drysuit', 'shorty', 'none']),
    thickness: finiteNumber.min(0).max(20).optional(),
    material: optionalText(255),
  }).optional(),
  weights: finiteNumber.min(0).max(1000).optional(),
  fins: optionalText(255),
  mask: optionalText(255),
  computer: optionalText(255),
  notes: optionalText(10000),
});

const conditionsSchema = z.object({
  waterTemp: z.object({
    surface: finiteNumber.min(-273.15).max(100).optional(),
    bottom: finiteNumber.min(-273.15).max(100).optional(),
  }).optional(),
  airTemp: finiteNumber.min(-273.15).max(100).optional(),
  visibility: finiteNumber.min(0).max(1000).optional(),
  current: z.object({
    strength: z.enum(['none', 'light', 'moderate', 'strong']),
    direction: optionalText(100),
  }).optional(),
  weather: z.enum(['sunny', 'cloudy', 'overcast', 'rainy', 'windy']).optional(),
  seaState: z.number().int().min(0).max(9).optional(),
  surge: z.enum(['none', 'light', 'moderate', 'heavy']).optional(),
});

const isValidLocalDateTime = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const timestamp = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));
  return timestamp.getUTCFullYear() === Number(year)
    && timestamp.getUTCMonth() === Number(month) - 1
    && timestamp.getUTCDate() === Number(day)
    && timestamp.getUTCHours() === Number(hour)
    && timestamp.getUTCMinutes() === Number(minute)
    && timestamp.getUTCSeconds() === Number(second);
};

const localDateTime = z.string().refine(
  isValidLocalDateTime,
  'must be a valid local ISO 8601 timestamp',
);

const backupDiveSchema = z.object({
  datetime: localDateTime,
  location: z.string().trim().min(1).max(255),
  depth: finiteNumber.positive().max(999.99),
  duration: z.number().int().min(1).max(1440),
  buddy: optionalText(255),
  lat: finiteNumber.min(-90).max(90),
  lng: finiteNumber.min(-180).max(180),
  samples: z.array(diveSampleSchema).optional(),
  equipment: equipmentSchema.optional(),
  conditions: conditionsSchema.optional(),
  diveType: z.enum(['recreational', 'training', 'technical', 'work', 'research']).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: optionalText(10000),
  safetyStops: z.array(z.object({
    depth: finiteNumber.positive().max(100),
    duration: z.number().int().min(1).max(180),
  })).optional(),
	diveNumber: z.number().int().min(1).max(10000000).optional(),
	tags: z.array(z.string().trim().min(1).max(100)).optional(),
	trip: z.object({
		id: z.number().int().nonnegative().default(0),
		name: z.string().trim().min(1).max(255),
		location: optionalText(255),
		startDate: optionalText(10),
		endDate: optionalText(10),
		notes: optionalText(10000),
		diveCount: z.number().int().nonnegative().optional(),
	}).optional(),
});

const settingsSchema = z.object({
  unitPreference: z.enum(['imperial', 'metric', 'customize']),
  units: z.object({
    depth: z.enum(['meters', 'feet']),
    temperature: z.enum(['celsius', 'fahrenheit']),
    distance: z.enum(['kilometers', 'miles']),
    weight: z.enum(['kilograms', 'pounds']),
    pressure: z.enum(['bar', 'psi']),
    volume: z.enum(['liters', 'cubic_feet']),
  }),
  preferences: z.object({
    dateFormat: z.enum(['ISO', 'US', 'EU']),
    timeFormat: z.enum(['12h', '24h']),
    defaultVisibility: z.enum(['private', 'public']),
  }),
  dive: z.object({
    showBuddyReminders: z.boolean(),
    autoCalculateNitrox: z.boolean(),
    defaultGasMix: z.string().trim().min(1).max(50),
    maxDepthWarning: z.number().int().min(1).max(330),
  }),
}).refine(
  (settings) => settings.units.depth === 'feet' || settings.dive.maxDepthWarning <= 100,
  { path: ['dive', 'maxDepthWarning'], message: 'must be at most 100 meters' },
);

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
	version: z.union([z.literal(1), z.literal(BACKUP_VERSION)]),
  createdAt: z.string().datetime(),
  data: z.object({
    dives: z.array(backupDiveSchema),
    diveSites: z.array(z.object({
      name: z.string().trim().min(1).max(255),
      latitude: finiteNumber.min(-90).max(90),
      longitude: finiteNumber.min(-180).max(180),
      description: optionalText(10000),
    })),
    settings: settingsSchema,
		trips: z.array(z.object({
			name: z.string().trim().min(1).max(255),
			location: optionalText(255),
			startDate: optionalText(10),
			endDate: optionalText(10),
			notes: optionalText(10000),
		})).default([]),
		tags: z.array(z.string().trim().min(1).max(100)).default([]),
  }),
});

export class BackupParseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'BackupParseError';
  }
}

export const createDiveLogBackup = (
  dives: Dive[],
  diveSites: DiveSite[],
  settings: UserSettings,
  createdAt = new Date(),
	trips: Trip[] = [],
	tags: string[] = [],
): DiveLogBackup => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  createdAt: createdAt.toISOString(),
  data: {
    dives: dives.map((dive) => structuredClone({
      datetime: dive.datetime,
      location: dive.location,
      depth: dive.depth,
      duration: dive.duration,
      buddy: dive.buddy,
      lat: dive.lat,
      lng: dive.lng,
      samples: dive.samples,
      equipment: dive.equipment,
      conditions: dive.conditions,
      diveType: dive.diveType,
      rating: dive.rating,
      notes: dive.notes,
      safetyStops: dive.safetyStops,
			diveNumber: dive.diveNumber,
			tags: dive.tags,
			trip: dive.trip ? { ...dive.trip, id: 0, diveCount: undefined } : undefined,
    })),
    diveSites: diveSites.map(({ name, latitude, longitude, description }) => ({
      name,
      latitude,
      longitude,
      ...(description === undefined ? {} : { description }),
    })),
    settings: structuredClone(settings),
		trips: trips.map(({ name, location, startDate, endDate, notes }) => ({ name, location, startDate, endDate, notes })),
		tags: [...tags],
  },
});

export const serializeDiveLogBackup = (backup: DiveLogBackup): string =>
  `${JSON.stringify(backup, null, 2)}\n`;

const describeValidationError = (error: z.ZodError): string => {
  const issue = error.issues[0];
  if (!issue) return 'Backup data is invalid';
  const path = issue.path.length > 0 ? issue.path.join('.') : 'backup';
  return `${path}: ${issue.message}`;
};

export const parseDiveLogBackup = (text: string): DiveLogBackup => {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new BackupParseError('Backup is not valid JSON', error);
  }

  const result = backupSchema.safeParse(value);
  if (!result.success) {
    throw new BackupParseError(describeValidationError(result.error), result.error);
  }
  return result.data;
};

const distanceKilometers = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const divesMatchForRestore = (
  left: Pick<BackupDive, 'datetime' | 'location' | 'lat' | 'lng'>,
  right: Pick<BackupDive, 'datetime' | 'location' | 'lat' | 'lng'>,
): boolean => (
  left.datetime === right.datetime
  && left.location.trim().toLocaleLowerCase() === right.location.trim().toLocaleLowerCase()
  && distanceKilometers(left.lat, left.lng, right.lat, right.lng) < 0.1
);

export interface RestoreDivePlan {
  dives: BackupDive[];
  duplicateCount: number;
}

export const planDiveRestore = (backupDives: BackupDive[], existingDives: Dive[]): RestoreDivePlan => {
  const dives: BackupDive[] = [];
  let duplicateCount = 0;

  for (const candidate of backupDives) {
    const isDuplicate = existingDives.some((existing) => divesMatchForRestore(candidate, existing))
      || dives.some((planned) => divesMatchForRestore(candidate, planned));
    if (isDuplicate) duplicateCount += 1;
    else dives.push(candidate);
  }

  return { dives, duplicateCount };
};

export const diveSitesMatchForRestore = (
  left: BackupDiveSite,
  right: Pick<DiveSite, 'name' | 'latitude' | 'longitude'>,
): boolean => (
  left.name.trim().toLocaleLowerCase() === right.name.trim().toLocaleLowerCase()
  && distanceKilometers(left.latitude, left.longitude, right.latitude, right.longitude) < 0.1
);

export interface RestoreDiveSitePlan {
  diveSites: BackupDiveSite[];
  duplicateCount: number;
}

export const planDiveSiteRestore = (
  backupSites: BackupDiveSite[],
  existingSites: DiveSite[],
): RestoreDiveSitePlan => {
  const diveSites: BackupDiveSite[] = [];
  let duplicateCount = 0;

  for (const candidate of backupSites) {
    const isDuplicate = existingSites.some((existing) => diveSitesMatchForRestore(candidate, existing))
      || diveSites.some((planned) => diveSitesMatchForRestore(candidate, planned));
    if (isDuplicate) duplicateCount += 1;
    else diveSites.push(candidate);
  }

  return { diveSites, duplicateCount };
};

const protectSpreadsheetCell = (value: string): string =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

const csvCell = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  const text = protectSpreadsheetCell(
    typeof value === 'object' ? JSON.stringify(value) : String(value),
  );
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const CSV_COLUMNS: Array<{ header: string; value: (dive: Dive) => unknown }> = [
  { header: 'datetime', value: (dive) => dive.datetime },
	{ header: 'dive_number', value: (dive) => dive.diveNumber },
  { header: 'location', value: (dive) => dive.location },
  { header: 'latitude', value: (dive) => dive.lat },
  { header: 'longitude', value: (dive) => dive.lng },
  { header: 'max_depth_m', value: (dive) => dive.depth },
  { header: 'duration_min', value: (dive) => dive.duration },
  { header: 'buddy', value: (dive) => dive.buddy },
  { header: 'dive_type', value: (dive) => dive.diveType },
  { header: 'rating', value: (dive) => dive.rating },
  { header: 'notes', value: (dive) => dive.notes },
	{ header: 'tags', value: (dive) => dive.tags?.join(', ') },
	{ header: 'trip_name', value: (dive) => dive.trip?.name },
	{ header: 'trip_location', value: (dive) => dive.trip?.location },
	{ header: 'trip_start_date', value: (dive) => dive.trip?.startDate },
	{ header: 'trip_end_date', value: (dive) => dive.trip?.endDate },
  { header: 'water_temp_surface_c', value: (dive) => dive.conditions?.waterTemp?.surface },
  { header: 'water_temp_bottom_c', value: (dive) => dive.conditions?.waterTemp?.bottom },
  { header: 'air_temp_c', value: (dive) => dive.conditions?.airTemp },
  { header: 'visibility_m', value: (dive) => dive.conditions?.visibility },
  { header: 'current_strength', value: (dive) => dive.conditions?.current?.strength },
  { header: 'current_direction', value: (dive) => dive.conditions?.current?.direction },
  { header: 'weather', value: (dive) => dive.conditions?.weather },
  { header: 'sea_state', value: (dive) => dive.conditions?.seaState },
  { header: 'surge', value: (dive) => dive.conditions?.surge },
  { header: 'safety_stops_json', value: (dive) => dive.safetyStops },
  { header: 'equipment_json', value: (dive) => dive.equipment },
  { header: 'samples_json', value: (dive) => dive.samples },
];

export const divesToCsv = (dives: Dive[]): string => {
  const rows = [
    CSV_COLUMNS.map(({ header }) => header).join(','),
    ...dives.map((dive) => CSV_COLUMNS.map(({ value }) => csvCell(value(dive))).join(',')),
  ];
  return `\uFEFF${rows.join('\r\n')}\r\n`;
};

export const datedExportFilename = (
  kind: 'backup' | 'dives',
  extension: 'json' | 'csv',
  date = new Date(),
): string => `${kind === 'backup' ? 'subsurface-web-backup' : 'dives'}-${date.toISOString().slice(0, 10)}.${extension}`;

import * as z from 'zod';
import type { DefaultValues } from 'react-hook-form';
import type { Dive, DiveConditions, Equipment, Trip } from './dives';
import type { UserSettings } from './settings';
import { convertDepth, convertTemperature } from './unitConversions';

const optionalNumber = (minimum: number, maximum: number) =>
  z.number().finite().min(minimum).max(maximum).optional();

export const createDiveFormSchema = (settings: UserSettings) => {
  const maxDepth = settings.units.depth === 'feet' ? 3280.8 : 999.99;
  const maxStopDepth = settings.units.depth === 'feet' ? 328.1 : 100;
  const maxVisibility = settings.units.depth === 'feet' ? 3280.8 : 1000;
  const minTemperature = settings.units.temperature === 'fahrenheit' ? -459.7 : -273.15;
  const maxTemperature = settings.units.temperature === 'fahrenheit' ? 212 : 100;

  return z.object({
    date: z.string().min(1, 'Date is required'),
    time: z.string().optional(),
    location: z.string().trim().min(1, 'Location is required').max(255),
    depth: z.number().finite().positive('Depth must be greater than zero').max(maxDepth),
		meanDepth: optionalNumber(0, maxDepth),
    duration: z.number().int().min(1, 'Duration must be at least one minute').max(1440),
		diveNumber: z.number().int().min(1).max(10000000).optional(),
		tags: z.string().max(1000).optional(),
		tripId: z.string().optional(),
    buddy: z.string().max(255).optional(),
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    diveType: z.enum(['recreational', 'training', 'technical', 'work', 'research']).or(z.literal('')).optional(),
		diveMode: z.enum(['OC', 'freedive', 'CCR', 'pSCR']).or(z.literal('')).optional(),
		computerVendor: z.string().max(255).optional(),
		computerModel: z.string().max(255).optional(),
		computerDeviceId: z.string().max(255).optional(),
		computerSerial: z.string().max(255).optional(),
		computerFirmware: z.string().max(255).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(10000).optional(),
    waterTempSurface: optionalNumber(minTemperature, maxTemperature),
    waterTempBottom: optionalNumber(minTemperature, maxTemperature),
    airTemp: optionalNumber(minTemperature, maxTemperature),
    visibility: optionalNumber(0, maxVisibility),
    currentStrength: z.enum(['none', 'light', 'moderate', 'strong']).or(z.literal('')).optional(),
    currentDirection: z.string().max(100).optional(),
    weather: z.enum(['sunny', 'cloudy', 'overcast', 'rainy', 'windy']).or(z.literal('')).optional(),
    seaState: z.number().int().min(0).max(9).optional(),
    surge: z.enum(['none', 'light', 'moderate', 'heavy']).or(z.literal('')).optional(),
    safetyStops: z.array(z.object({
      depth: z.number().finite().positive('Stop depth must be greater than zero').max(maxStopDepth),
      duration: z.number().int().min(1).max(180),
    })),
  }).refine(
    (values) => !values.currentDirection?.trim() || Boolean(values.currentStrength),
    { path: ['currentDirection'], message: 'Select a current strength before adding a direction' },
	).refine(
		(values) => values.meanDepth === undefined || values.meanDepth <= values.depth,
		{ path: ['meanDepth'], message: 'Mean depth cannot exceed maximum depth' },
  );
};

export type DiveFormValues = z.infer<ReturnType<typeof createDiveFormSchema>>;

export const optionalNumberInput = (value: string): number | undefined =>
  value === '' ? undefined : Number(value);

const cleanOptionalString = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const hasConditions = (conditions: DiveConditions): boolean =>
  Boolean(
    conditions.waterTemp ||
    conditions.airTemp !== undefined ||
    conditions.visibility !== undefined ||
    conditions.current ||
    conditions.weather ||
    conditions.seaState !== undefined ||
    conditions.surge,
  );

export const diveToFormValues = (
  dive: Dive | undefined,
  settings: UserSettings,
): DefaultValues<DiveFormValues> => {
  if (!dive) {
    return { safetyStops: [], tags: '', tripId: '' };
  }

  const [date, timePart = ''] = dive.datetime.split('T');
  const time = timePart.slice(0, 5);
  const convertStoredDepth = (value: number) => convertDepth(value, 'meters', settings.units.depth);
  const convertStoredTemperature = (value: number | undefined) =>
    value === undefined
      ? undefined
      : convertTemperature(value, 'celsius', settings.units.temperature);

  return {
    date,
    time: time === '00:00' ? '' : time,
    location: dive.location,
    depth: convertStoredDepth(dive.depth),
		meanDepth: dive.meanDepth === undefined ? undefined : convertStoredDepth(dive.meanDepth),
    duration: dive.duration,
		diveNumber: dive.diveNumber,
		tags: dive.tags?.join(', ') ?? '',
		tripId: dive.trip ? String(dive.trip.id) : '',
    buddy: dive.buddy ?? '',
    lat: dive.lat,
    lng: dive.lng,
    diveType: dive.diveType ?? '',
		diveMode: dive.diveMode ?? '',
		computerVendor: dive.computer?.vendor ?? '',
		computerModel: dive.computer?.model ?? '',
		computerDeviceId: dive.computer?.deviceId ?? '',
		computerSerial: dive.computer?.serial ?? '',
		computerFirmware: dive.computer?.firmware ?? '',
    rating: dive.rating,
    notes: dive.notes ?? '',
    waterTempSurface: convertStoredTemperature(dive.conditions?.waterTemp?.surface),
    waterTempBottom: convertStoredTemperature(dive.conditions?.waterTemp?.bottom),
    airTemp: convertStoredTemperature(dive.conditions?.airTemp),
    visibility: dive.conditions?.visibility === undefined
      ? undefined
      : convertStoredDepth(dive.conditions.visibility),
    currentStrength: dive.conditions?.current?.strength ?? '',
    currentDirection: dive.conditions?.current?.direction ?? '',
    weather: dive.conditions?.weather ?? '',
    seaState: dive.conditions?.seaState,
    surge: dive.conditions?.surge ?? '',
    safetyStops: dive.safetyStops?.map((stop) => ({
      depth: convertStoredDepth(stop.depth),
      duration: stop.duration,
    })) ?? [],
  };
};

export const diveFormValuesToDive = (
  values: DiveFormValues,
  settings: UserSettings,
  equipment?: Equipment,
  existingDive?: Dive,
	trips: Trip[] = [],
): Omit<Dive, 'id'> => {
  const convertEnteredDepth = (value: number) => convertDepth(value, settings.units.depth, 'meters');
  const convertEnteredTemperature = (value: number | undefined) =>
    value === undefined
      ? undefined
      : convertTemperature(value, settings.units.temperature, 'celsius');

  const surfaceTemperature = convertEnteredTemperature(values.waterTempSurface);
  const bottomTemperature = convertEnteredTemperature(values.waterTempBottom);
  const conditions: DiveConditions = {
    waterTemp: surfaceTemperature !== undefined || bottomTemperature !== undefined
      ? { surface: surfaceTemperature, bottom: bottomTemperature }
      : undefined,
    airTemp: convertEnteredTemperature(values.airTemp),
    visibility: values.visibility === undefined ? undefined : convertEnteredDepth(values.visibility),
    current: values.currentStrength
      ? {
          strength: values.currentStrength,
          direction: cleanOptionalString(values.currentDirection),
        }
      : undefined,
    weather: values.weather || undefined,
    seaState: values.seaState,
    surge: values.surge || undefined,
  };
	const computer = {
		vendor: cleanOptionalString(values.computerVendor),
		model: cleanOptionalString(values.computerModel),
		deviceId: cleanOptionalString(values.computerDeviceId),
		serial: cleanOptionalString(values.computerSerial),
		firmware: cleanOptionalString(values.computerFirmware),
	};
	const hasComputerIdentity = Object.values(computer).some(Boolean);

  return {
    datetime: `${values.date}T${values.time || '00:00'}:00`,
    location: values.location.trim(),
    depth: convertEnteredDepth(values.depth),
		meanDepth: values.meanDepth === undefined ? undefined : convertEnteredDepth(values.meanDepth),
    duration: values.duration,
		diveNumber: values.diveNumber,
		tags: [...new Map((values.tags ?? '').split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
			.map((tag) => [tag.toLocaleLowerCase(), tag])).values()],
		trip: values.tripId
			? trips.find((trip) => trip.id === Number(values.tripId))
				?? (existingDive?.trip?.id === Number(values.tripId) ? existingDive.trip : undefined)
			: undefined,
    buddy: cleanOptionalString(values.buddy),
    lat: values.lat,
    lng: values.lng,
    samples: existingDive?.samples,
    equipment,
    conditions: hasConditions(conditions) ? conditions : undefined,
    diveType: values.diveType || undefined,
		diveMode: values.diveMode || undefined,
		computer: hasComputerIdentity ? computer : undefined,
    rating: values.rating,
    notes: cleanOptionalString(values.notes),
    safetyStops: values.safetyStops.length > 0
      ? values.safetyStops.map((stop) => ({
          depth: convertEnteredDepth(stop.depth),
          duration: stop.duration,
        }))
      : undefined,
  };
};

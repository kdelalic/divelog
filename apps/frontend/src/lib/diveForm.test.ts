import { describe, expect, it } from 'vitest';
import type { Dive } from './dives';
import {
  createDiveFormSchema,
  diveFormValuesToDive,
  diveToFormValues,
  type DiveFormValues,
} from './diveForm';
import { defaultSettings, type UserSettings } from './settings';

const metricSettings: UserSettings = structuredClone(defaultSettings);
const imperialSettings: UserSettings = {
  ...structuredClone(defaultSettings),
  unitPreference: 'imperial',
  units: {
    ...defaultSettings.units,
    depth: 'feet',
    temperature: 'fahrenheit',
  },
};

const formValues = (overrides: Partial<DiveFormValues> = {}): DiveFormValues => ({
  date: '2026-08-08',
  time: '09:45',
  location: '  Blue Hole  ',
  depth: 30,
  duration: 48,
  buddy: '  Sam  ',
  lat: 28.5721,
  lng: 34.5372,
  diveType: 'recreational',
	diveMode: 'CCR',
	meanDepth: 18,
	computerVendor: 'Shearwater',
	computerModel: 'Perdix 2',
	computerDeviceId: 'abc123',
  rating: 4,
  notes: '  Clear water  ',
  waterTempSurface: 25,
  waterTempBottom: 20,
  airTemp: 28,
  visibility: 18,
  currentStrength: 'moderate',
  currentDirection: 'NE',
  weather: 'sunny',
  seaState: 2,
  surge: 'light',
  safetyStops: [{ depth: 5, duration: 3 }],
  ...overrides,
});

describe('diveFormValuesToDive', () => {
  it('maps enhanced metric fields to the persisted dive model', () => {
    const dive = diveFormValuesToDive(formValues(), metricSettings);

    expect(dive).toMatchObject({
      datetime: '2026-08-08T09:45:00',
      location: 'Blue Hole',
      depth: 30,
      buddy: 'Sam',
      diveType: 'recreational',
			diveMode: 'CCR',
			meanDepth: 18,
			computer: { vendor: 'Shearwater', model: 'Perdix 2', deviceId: 'abc123' },
      rating: 4,
      notes: 'Clear water',
      conditions: {
        waterTemp: { surface: 25, bottom: 20 },
        airTemp: 28,
        visibility: 18,
        current: { strength: 'moderate', direction: 'NE' },
        weather: 'sunny',
        seaState: 2,
        surge: 'light',
      },
      safetyStops: [{ depth: 5, duration: 3 }],
    });
  });

  it('converts imperial entries to metric storage values', () => {
    const dive = diveFormValuesToDive(
      formValues({
        depth: 100,
				meanDepth: 60,
        waterTempSurface: 77,
        waterTempBottom: 68,
        airTemp: 86,
        visibility: 60,
        safetyStops: [{ depth: 15, duration: 3 }],
      }),
      imperialSettings,
    );

    expect(dive.depth).toBe(30.5);
		expect(dive.meanDepth).toBe(18.3);
    expect(dive.conditions?.waterTemp).toEqual({ surface: 25, bottom: 20 });
    expect(dive.conditions?.airTemp).toBe(30);
    expect(dive.conditions?.visibility).toBe(18.3);
    expect(dive.safetyStops).toEqual([{ depth: 4.6, duration: 3 }]);
  });

  it('omits empty optional groups instead of sending empty objects', () => {
    const dive = diveFormValuesToDive(formValues({
      buddy: '',
      diveType: '',
			diveMode: '',
			meanDepth: undefined,
			computerVendor: '',
			computerModel: '',
			computerDeviceId: '',
      rating: undefined,
      notes: '   ',
      waterTempSurface: undefined,
      waterTempBottom: undefined,
      airTemp: undefined,
      visibility: undefined,
      currentStrength: '',
      currentDirection: '',
      weather: '',
      seaState: undefined,
      surge: '',
      safetyStops: [],
    }), metricSettings);

    expect(dive.buddy).toBeUndefined();
    expect(dive.conditions).toBeUndefined();
    expect(dive.safetyStops).toBeUndefined();
    expect(dive.notes).toBeUndefined();
		expect(dive.computer).toBeUndefined();
  });

  it('preserves imported profile samples while editing', () => {
    const existingDive = {
      id: 7,
      ...diveFormValuesToDive(formValues(), metricSettings),
      samples: [{ time: 0, depth: 0 }, { time: 60, depth: 12 }],
    } satisfies Dive;

    const updated = diveFormValuesToDive(formValues({ notes: 'Updated' }), metricSettings, undefined, existingDive);

    expect(updated.samples).toEqual(existingDive.samples);
  });
});

describe('diveToFormValues', () => {
  it('round-trips stored values into imperial display units without shifting wall-clock time', () => {
    const dive = {
      id: 12,
      ...diveFormValuesToDive(formValues(), metricSettings),
    } satisfies Dive;

    const values = diveToFormValues(dive, imperialSettings);

    expect(values.date).toBe('2026-08-08');
    expect(values.time).toBe('09:45');
    expect(values.depth).toBe(98.4);
		expect(values.meanDepth).toBe(59.1);
    expect(values.waterTempSurface).toBe(77);
    expect(values.waterTempBottom).toBe(68);
    expect(values.visibility).toBe(59.1);
    expect(values.safetyStops).toEqual([{ depth: 16.4, duration: 3 }]);
  });

	it('rejects a mean depth deeper than the maximum depth', () => {
		const parsed = createDiveFormSchema(metricSettings).safeParse(formValues({ depth: 20, meanDepth: 21 }));
		expect(parsed.success).toBe(false);
		if (!parsed.success) expect(parsed.error.issues.some((issue) => issue.path.join('.') === 'meanDepth')).toBe(true);
	});
});

describe('createDiveFormSchema', () => {
  it('matches backend minimums for depth, duration, ratings, and safety stops', () => {
    const parsed = createDiveFormSchema(metricSettings).safeParse(formValues({
      depth: 0,
      duration: 0,
      rating: 6,
      safetyStops: [{ depth: 0, duration: 0 }],
    }));

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.path.join('.'));
      expect(fields).toEqual(expect.arrayContaining([
        'depth',
        'duration',
        'rating',
        'safetyStops.0.depth',
        'safetyStops.0.duration',
      ]));
    }
  });
});

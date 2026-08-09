import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubsurfaceCSVParseError, parseSubsurfaceCSV } from './subsurfaceCsvParser';

const HEADER =
  'dive number,date,time,duration [min],sac [l/min],maxdepth [m],avgdepth [m],mode,' +
  'airtemp [C],watertemp [C],cylinder size (1) [l],startpressure (1) [bar],endpressure (1) [bar],' +
  'o2 (1) [%],he (1) [%],location,gps,divemaster,buddy,suit,rating,visibility,notes,weight [kg],tags';

// Columns in Subsurface's export order, so a row reads the same way it would in
// a real file.
const row = (over: Record<string, string> = {}) => {
  const fields: Record<string, string> = {
    'dive number': '1',
    date: '2024-03-15',
    time: '09:30:00',
    'duration [min]': '45',
    'sac [l/min]': '18.5',
    'maxdepth [m]': '28.4',
    'avgdepth [m]': '16.2',
    mode: 'OC',
    'airtemp [C]': '24',
    'watertemp [C]': '18',
    'cylinder size (1) [l]': '12',
    'startpressure (1) [bar]': '210',
    'endpressure (1) [bar]': '60',
    'o2 (1) [%]': '21',
    'he (1) [%]': '0',
    location: 'Blue Hole',
    gps: '28.5721 34.5372',
    divemaster: 'Sam',
    buddy: 'Jane Diver',
    suit: '5mm neoprene',
    rating: '4',
    visibility: '20',
    notes: 'Great dive',
    'weight [kg]': '6',
    tags: 'reef',
    ...over,
  };
  return HEADER.split(',').map(h => fields[h] ?? '').join(',');
};

const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');

beforeEach(() => {
  // The parser warns per bad row by design; keep the suite output readable.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('parseSubsurfaceCSV', () => {
  it('parses core dive fields', () => {
    const [dive] = parseSubsurfaceCSV(csv(row()));

    expect(dive.location).toBe('Blue Hole');
    expect(dive.depth).toBe(28.4);
    expect(dive.duration).toBe(45);
    expect(dive.buddy).toBe('Jane Diver');
    expect(dive.notes).toBe('Great dive');
    expect(dive.rating).toBe(4);
    expect(dive.diveType).toBe('recreational');
  });

  // The suite runs in UTC+14, so appending a 'Z' as the old code did would roll
  // this timestamp back to the 14th.
  it('keeps the timestamp as site wall-clock time', () => {
    const [dive] = parseSubsurfaceCSV(csv(row()));

    expect(dive.datetime).toBe('2024-03-15T09:30:00');
  });

  it('parses space-separated GPS coordinates', () => {
    const [dive] = parseSubsurfaceCSV(csv(row()));

    expect(dive.lat).toBeCloseTo(28.5721, 4);
    expect(dive.lng).toBeCloseTo(34.5372, 4);
  });

  it('parses negative GPS coordinates', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ gps: '-16.9186 145.7781' })));

    expect(dive.lat).toBeCloseTo(-16.9186, 4);
    expect(dive.lng).toBeCloseTo(145.7781, 4);
  });

  it('defaults coordinates to zero when GPS is absent', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ gps: '' })));

    expect(dive.lat).toBe(0);
    expect(dive.lng).toBe(0);
  });

  it('accepts MM:SS duration and rounds to whole minutes', () => {
    expect(parseSubsurfaceCSV(csv(row({ 'duration [min]': '45:30' })))[0].duration).toBe(46);
    expect(parseSubsurfaceCSV(csv(row({ 'duration [min]': '45:20' })))[0].duration).toBe(45);
  });

  it('builds an air gas mix from the tank columns', () => {
    const [dive] = parseSubsurfaceCSV(csv(row()));
    const tank = dive.equipment!.tanks[0];

    expect(tank.size).toBe(12);
    expect(tank.start_pressure).toBe(210);
    expect(tank.end_pressure).toBe(60);
    expect(tank.gas_mix).toMatchObject({ oxygen: 21, helium: 0, nitrogen: 79, name: 'Air' });
  });

  it('names a nitrox mix from the O2 percentage', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ 'o2 (1) [%]': '32' })));

    expect(dive.equipment!.tanks[0].gas_mix).toMatchObject({ nitrogen: 68, name: 'EANx32' });
  });

  it('names a trimix from the helium percentage', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ 'o2 (1) [%]': '18', 'he (1) [%]': '45' })));

    expect(dive.equipment!.tanks[0].gas_mix).toMatchObject({ nitrogen: 37, name: 'Trimix 18/45' });
  });

  it('omits equipment when no cylinder is recorded', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ 'cylinder size (1) [l]': '' })));

    expect(dive.equipment).toBeUndefined();
  });

  it('records the suit and weights', () => {
    const [dive] = parseSubsurfaceCSV(csv(row()));

    expect(dive.equipment!.wetsuit).toMatchObject({ type: 'wetsuit', material: '5mm neoprene' });
    expect(dive.equipment!.weights).toBe(6);
  });

  it('marks the suit as none when the column is blank', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ suit: '' })));

    expect(dive.equipment!.wetsuit!.type).toBe('none');
  });

  it('parses conditions', () => {
    const [dive] = parseSubsurfaceCSV(csv(row()));

    expect(dive.conditions).toEqual({
      airTemp: 24,
      waterTemp: { surface: 18, bottom: 18 },
      visibility: 20,
    });
  });

  it('omits conditions entirely when no readings are present', () => {
    const [dive] = parseSubsurfaceCSV(
      csv(row({ 'airtemp [C]': '', 'watertemp [C]': '', visibility: '' })),
    );

    expect(dive.conditions).toBeUndefined();
  });

  it('keeps partial conditions when only some readings are present', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ 'airtemp [C]': '', visibility: '' })));

    expect(dive.conditions).toEqual({
      airTemp: undefined,
      waterTemp: { surface: 18, bottom: 18 },
      visibility: undefined,
    });
  });

  it('handles quoted fields containing commas', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ notes: '"Strong current, aborted early"' })));

    expect(dive.notes).toBe('Strong current, aborted early');
  });

  it('handles escaped quotes inside a quoted field', () => {
    const [dive] = parseSubsurfaceCSV(csv(row({ notes: '"Saw a ""cleaner"" wrasse"' })));

    expect(dive.notes).toBe('Saw a "cleaner" wrasse');
  });

  it('handles newlines inside a quoted field', () => {
    const multiline = csv(row({ notes: '"First line\nSecond line"' }));
    const [dive] = parseSubsurfaceCSV(multiline);

    expect(dive.notes).toBe('First line\nSecond line');
  });

  // One unparseable row shouldn't cost the user the rest of the import.
  it('skips invalid rows and keeps the valid ones', () => {
    const dives = parseSubsurfaceCSV(
      csv(row(), row({ 'dive number': '2', 'maxdepth [m]': '' }), row({ 'dive number': '3' })),
    );

    expect(dives).toHaveLength(2);
  });

  it.each([
    ['a missing location', { location: '' }],
    ['a missing date', { date: '' }],
    ['a missing time', { time: '' }],
    ['a zero depth', { 'maxdepth [m]': '0' }],
    ['a negative depth', { 'maxdepth [m]': '-5' }],
    ['a zero duration', { 'duration [min]': '0' }],
  ])('rejects a row with %s', (_label, over) => {
    expect(() => parseSubsurfaceCSV(csv(row(over)))).toThrow(SubsurfaceCSVParseError);
  });

  it('ignores blank lines', () => {
    expect(parseSubsurfaceCSV([HEADER, row(), '', '  '].join('\n'))).toHaveLength(1);
  });

  it('rejects a file with no data rows', () => {
    expect(() => parseSubsurfaceCSV(HEADER)).toThrow(/at least a header and one data row/);
  });

  it('names the headers that are missing', () => {
    expect(() => parseSubsurfaceCSV('date,time\n2024-03-15,09:30:00')).toThrow(
      /Missing required headers:.*dive number/,
    );
  });
});

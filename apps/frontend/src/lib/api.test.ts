import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunkDivesForUpload, deserializeDive, divesApi, serializeDive } from './api';
import type { Dive } from './dives';

// The client models are camelCase and the Go API is snake_case. Go silently
// ignores unknown JSON keys, so a naming mismatch here does not fail loudly -
// the field just never arrives. These tests assert the wire shape directly.
const dive = (over: Partial<Dive> = {}): Omit<Dive, 'id'> => ({
  datetime: '2024-03-15T09:30:00',
  location: 'Blue Hole',
  depth: 28.4,
  duration: 45,
  lat: 28.5721,
  lng: 34.5372,
  ...over,
});

describe('serializeDive', () => {
  it('passes through the fields that already match the API', () => {
    expect(serializeDive(dive({ buddy: 'Jane Diver', notes: 'Great dive', rating: 4 }))).toMatchObject({
      datetime: '2024-03-15T09:30:00',
      location: 'Blue Hole',
      depth: 28.4,
      duration: 45,
      lat: 28.5721,
      lng: 34.5372,
      buddy: 'Jane Diver',
      notes: 'Great dive',
      rating: 4,
    });
  });

  it('renames diveType and safetyStops to snake_case', () => {
    const payload = serializeDive(
      dive({ diveType: 'technical', safetyStops: [{ depth: 5, duration: 3 }] }),
    );

    expect(payload).toMatchObject({
      dive_type: 'technical',
      safety_stops: [{ depth: 5, duration: 3 }],
    });
    expect(payload).not.toHaveProperty('diveType');
    expect(payload).not.toHaveProperty('safetyStops');
  });

  it('flattens conditions to the API field names', () => {
    const payload = serializeDive(
      dive({
        conditions: {
          waterTemp: { surface: 24, bottom: 18 },
          airTemp: 26,
          visibility: 20,
          current: { strength: 'moderate', direction: 'NE' },
          weather: 'sunny',
          seaState: 2,
          surge: 'light',
        },
      }),
    );

    expect(payload.conditions).toEqual({
      water_temp_surface: 24,
      water_temp_bottom: 18,
      air_temp: 26,
      visibility: 20,
      current_strength: 'moderate',
      current_direction: 'NE',
      weather: 'sunny',
      sea_state: 2,
      surge: 'light',
    });
  });

  // The dives table has a scalar water_temperature column alongside the
  // conditions JSON, and bottom temperature is the meaningful one for a dive.
  it('promotes bottom temperature to the top-level water_temperature', () => {
    expect(serializeDive(dive({ conditions: { waterTemp: { surface: 24, bottom: 18 } } })))
      .toMatchObject({ water_temperature: 18 });
  });

  it('falls back to surface temperature when there is no bottom reading', () => {
    expect(serializeDive(dive({ conditions: { waterTemp: { surface: 24 } } })))
      .toMatchObject({ water_temperature: 24 });
  });

  it('keeps a bottom temperature of zero rather than treating it as missing', () => {
    expect(serializeDive(dive({ conditions: { waterTemp: { surface: 24, bottom: 0 } } })))
      .toMatchObject({ water_temperature: 0 });
  });

  // The API models visibility as a whole number of meters.
  it('rounds visibility to a whole number at the top level', () => {
    const payload = serializeDive(dive({ conditions: { visibility: 17.6 } }));

    expect(payload.visibility).toBe(18);
    expect(payload.conditions?.visibility).toBe(17.6);
  });

  it('leaves conditions undefined when the dive has none', () => {
    const payload = serializeDive(dive());

    expect(payload.conditions).toBeUndefined();
    expect(payload.water_temperature).toBeUndefined();
    expect(payload.visibility).toBeUndefined();
  });

  it('serializes equipment and samples unchanged', () => {
    const equipment = {
      tanks: [
        {
          size: 12,
          working_pressure: 232,
          start_pressure: 210,
          end_pressure: 60,
          gas_mix: { oxygen: 21, helium: 0, nitrogen: 79, name: 'Air' },
        },
      ],
    };
    const samples = [{ time: 0, depth: 0 }, { time: 600, depth: 28.4 }];

    expect(serializeDive(dive({ equipment, samples }))).toMatchObject({ equipment, samples });
  });

  // A round-trip through JSON is what actually goes over the wire, and it is
  // where undefined values disappear.
  it('drops undefined optional fields from the JSON body', () => {
    const body = JSON.parse(JSON.stringify(serializeDive(dive())));

    expect(body).not.toHaveProperty('conditions');
    expect(body).not.toHaveProperty('dive_type');
    expect(body).not.toHaveProperty('safety_stops');
    expect(body).not.toHaveProperty('water_temperature');
  });
});

describe('deserializeDive', () => {
  it('normalizes enhanced API fields into the client model', () => {
    const result = deserializeDive({
      id: 3,
      datetime: '2024-03-15T09:30:00',
      location: 'Blue Hole',
      depth: 28.4,
      duration: 45,
      lat: 28.5721,
      lng: 34.5372,
      dive_type: 'technical',
      safety_stops: [{ depth: 5, duration: 3 }],
      conditions: {
        water_temp_surface: 24,
        water_temp_bottom: 18,
        air_temp: 26,
        visibility: 20,
        current_strength: 'moderate',
        current_direction: 'NE',
        weather: 'sunny',
        sea_state: 2,
        surge: 'light',
      },
    });

    expect(result).toMatchObject({
      diveType: 'technical',
      safetyStops: [{ depth: 5, duration: 3 }],
      conditions: {
        waterTemp: { surface: 24, bottom: 18 },
        airTemp: 26,
        visibility: 20,
        current: { strength: 'moderate', direction: 'NE' },
        weather: 'sunny',
        seaState: 2,
        surge: 'light',
      },
    });
    expect(result).not.toHaveProperty('dive_type');
    expect(result).not.toHaveProperty('safety_stops');
  });

  it('does not invent nested condition groups when the API omits them', () => {
    const result = deserializeDive({
      id: 4,
      datetime: '2024-03-16T10:00:00',
      location: 'The Wall',
      depth: 20,
      duration: 35,
      lat: 0,
      lng: 0,
    });

    expect(result.conditions).toBeUndefined();
    expect(result.diveType).toBeUndefined();
    expect(result.safetyStops).toBeUndefined();
  });
});

describe('chunkDivesForUpload', () => {
  it('keeps each serialized request within the configured byte limit', () => {
    const dives = [
      dive({ notes: 'a'.repeat(80) }),
      dive({ notes: 'b'.repeat(80) }),
      dive({ notes: 'c'.repeat(80) }),
    ];
    const oneDiveBytes = new TextEncoder().encode(JSON.stringify(serializeDive(dives[0]))).byteLength;
    const chunks = chunkDivesForUpload(dives, oneDiveBytes + 2);

    expect(chunks).toHaveLength(3);
    for (const chunk of chunks) {
      const wireBytes = new TextEncoder().encode(JSON.stringify(chunk.map(serializeDive))).byteLength;
      expect(wireBytes).toBeLessThanOrEqual(oneDiveBytes + 2);
    }
  });

  it('preserves order and uses no empty chunks', () => {
    const dives = [dive({ location: 'First' }), dive({ location: 'Second' })];
    expect(chunkDivesForUpload(dives).flat().map(({ location }) => location)).toEqual(['First', 'Second']);
    expect(chunkDivesForUpload([])).toEqual([]);
  });

  it('rejects a single profile that cannot fit in a request', () => {
    expect(() => chunkDivesForUpload([dive({ notes: 'large' })], 10)).toThrow(/single dive profile/);
  });
});

describe('divesApi.createMultipleDives', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the backend validation message and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Validation failed',
      fields: { 'dives[0].equipment.tanks[0].size': 'must be greater than 0' },
    }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })));

    const result = await divesApi.createMultipleDives([dive()]);

    expect(result.status).toBe(422);
    expect(result.error).toContain('Validation failed');
    expect(result.error).toContain('equipment.tanks[0].size');
  });

  it('distinguishes a network failure from an HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    const result = await divesApi.createMultipleDives([dive()]);

    expect(result.status).toBeUndefined();
    expect(result.error).toBe('Failed to fetch');
  });
});

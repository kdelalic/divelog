import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DiveImportParseError, parseDiveImportFile } from './diveImportParser';

const fixture = (name: string) => {
  const bytes = readFileSync(path.resolve(process.cwd(), '../../testdata', name));
  return new File([bytes], name);
};

describe('parseDiveImportFile real export fixtures', () => {
  it('imports the complete Oceanic UDDF export', async () => {
    const result = await parseDiveImportFile(fixture('oceanic.uddf'));
    expect(result.kind).toBe('dives');
    if (result.kind !== 'dives') return;

    expect(result.format).toBe('uddf');
    expect(result.dives).toHaveLength(50);
    expect(result.dives.reduce((count, dive) => count + (dive.samples?.length ?? 0), 0)).toBe(7738);
  });

  it('imports the complete Subsurface UDDF export', async () => {
    const result = await parseDiveImportFile(fixture('subsurface.uddf'));
    expect(result.kind).toBe('dives');
    if (result.kind !== 'dives') return;

    expect(result.dives).toHaveLength(41);
    expect(result.dives.reduce((count, dive) => count + (dive.samples?.length ?? 0), 0)).toBe(7105);
    expect(result.dives[40]).toMatchObject({
      datetime: '2026-07-03T12:08:43',
      location: 'La Jolla Cove',
      duration: 77,
    });
    expect(result.dives[40].samples).toHaveLength(385);
  });

  it('imports the Subsurface summary CSV export', async () => {
    const result = await parseDiveImportFile(fixture('subsurface.csv'));
    expect(result.kind).toBe('dives');
    if (result.kind !== 'dives') return;

    expect(result.format).toBe('subsurface-csv');
    expect(result.dives).toHaveLength(41);
		expect(result.dives[40]).toMatchObject({ diveNumber: 41, location: 'La Jolla Cove', depth: 7.41, duration: 77 });
  });

  it('imports the Subsurface dive-computer profile CSV export', async () => {
    const result = await parseDiveImportFile(fixture('dive_computer_profiles.csv'));
    expect(result.kind).toBe('dives');
    if (result.kind !== 'dives') return;

    expect(result.format).toBe('subsurface-profile-csv');
    expect(result.dives).toHaveLength(41);
    expect(result.dives.reduce((count, dive) => count + (dive.samples?.length ?? 0), 0)).toBe(7105);
    expect(result.dives[40]).toMatchObject({
      id: 41,
			diveNumber: 41,
      datetime: '2026-07-03T12:08:43',
      depth: 7.35,
      duration: 77,
    });
    expect(result.dives[40].samples).toHaveLength(385);
  });

  it.each(['subsurface.xml', 'subsurface.ssrf'])(
    'imports the full native Subsurface export from %s',
    async name => {
      const result = await parseDiveImportFile(fixture(name));
      expect(result.kind).toBe('dives');
      if (result.kind !== 'dives') return;

      expect(result.format).toBe('subsurface-xml');
      expect(result.dives).toHaveLength(41);
      expect(result.dives.reduce((count, dive) => count + (dive.samples?.length ?? 0), 0)).toBe(7105);
      expect(result.dives.flatMap(dive => dive.equipment?.tanks ?? []).every(tank => tank.size > 0)).toBe(true);
      expect(result.dives[40]).toMatchObject({
        id: 41,
			diveNumber: 41,
        location: 'La Jolla Cove',
        depth: 7.41,
        duration: 77,
      });
    },
  );

  it('imports the standalone Subsurface dive-site export', async () => {
    const result = await parseDiveImportFile(fixture('subsurface_sites.xml'));
    expect(result.kind).toBe('sites');
    if (result.kind !== 'sites') return;

    expect(result.sites).toHaveLength(32);
    expect(result.sites[0]).toEqual({
      name: 'McAbee Beach',
      latitude: 36.615614,
      longitude: -121.899165,
      description: undefined,
    });
  });

  it('detects content independently of the filename extension', async () => {
    const source = fixture('subsurface.uddf');
    const renamed = new File([await source.arrayBuffer()], 'renamed.xml');
    const result = await parseDiveImportFile(renamed);

    expect(result.kind).toBe('dives');
    expect(result.format).toBe('uddf');
  });

  it('rejects unrelated CSV data with a useful error', async () => {
    const file = new File(['foo,bar\n1,2'], 'unknown.csv');
    await expect(parseDiveImportFile(file)).rejects.toThrow(DiveImportParseError);
  });
});

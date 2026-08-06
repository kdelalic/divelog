import { describe, expect, it, vi } from 'vitest';
import { UDDFParseError, getUDDFImportSummary, parseUDDFFile, validateUDDFFile } from './uddfParser';
import type { Dive } from './dives';

const uddfFile = (xml: string, name = 'dives.uddf') =>
  new File([xml], name, { type: 'application/xml' });

// A minimal but structurally realistic UDDF document. Dive computers emit SI
// base units here: temperature in Kelvin, pressure in Pascal, duration in
// seconds.
const sampleUDDF = `<?xml version="1.0" encoding="UTF-8"?>
<uddf version="3.2.0">
  <divesite>
    <site id="site-1">
      <name>Blue Hole</name>
      <geography>
        <latitude>28.5721</latitude>
        <longitude>34.5372</longitude>
      </geography>
    </site>
  </divesite>
  <profiledata>
    <repetitiongroup>
      <dive id="dive-1">
        <informationbeforedive>
          <datetime>2024-03-15T09:30:00</datetime>
          <link ref="site-1"/>
        </informationbeforedive>
        <samples>
          <waypoint>
            <divetime>0</divetime>
            <depth>0</depth>
            <temperature>295.15</temperature>
            <tankpressure>20000000</tankpressure>
          </waypoint>
          <waypoint>
            <divetime>600</divetime>
            <depth>28.4</depth>
            <temperature>291.15</temperature>
            <tankpressure>15000000</tankpressure>
          </waypoint>
        </samples>
        <informationafterdive>
          <greatestdepth>28.42</greatestdepth>
          <diveduration>2700</diveduration>
          <buddy>
            <personal>
              <firstname>Jane</firstname>
              <lastname>Diver</lastname>
            </personal>
          </buddy>
        </informationafterdive>
      </dive>
    </repetitiongroup>
  </profiledata>
</uddf>`;

describe('parseUDDFFile', () => {
  it('parses a dive with site, depth, duration and buddy', async () => {
    const [dive] = await parseUDDFFile(uddfFile(sampleUDDF));

    expect(dive.location).toBe('Blue Hole');
    expect(dive.lat).toBeCloseTo(28.5721, 4);
    expect(dive.lng).toBeCloseTo(34.5372, 4);
    expect(dive.depth).toBe(28.4);
    expect(dive.buddy).toBe('Jane Diver');
  });

  it('converts dive duration from seconds to whole minutes', async () => {
    const [dive] = await parseUDDFFile(uddfFile(sampleUDDF));

    expect(dive.duration).toBe(45);
  });

  // UDDF temperatures are Kelvin. Reading 295.15 as celsius would show a 295°C
  // dive, and reading 20000000 Pa as bar would show a 20-million-bar tank.
  it('converts sample temperature from Kelvin to celsius', async () => {
    const [dive] = await parseUDDFFile(uddfFile(sampleUDDF));

    expect(dive.samples?.[0].temperature).toBe(22);
    expect(dive.samples?.[1].temperature).toBe(18);
  });

  it('converts sample pressure from Pascal to bar', async () => {
    const [dive] = await parseUDDFFile(uddfFile(sampleUDDF));

    expect(dive.samples?.[0].pressure).toBe(200);
    expect(dive.samples?.[1].pressure).toBe(150);
  });

  // The suite runs in UTC+14, so anything that routes the timestamp through
  // toISOString() lands on the previous day and fails here.
  it('keeps the timestamp as site wall-clock time', async () => {
    const [dive] = await parseUDDFFile(uddfFile(sampleUDDF));

    expect(dive.datetime).toBe('2024-03-15T09:30:00');
  });

  it('accepts a space separator and a missing seconds component', async () => {
    const xml = sampleUDDF.replace('2024-03-15T09:30:00', '2024-03-15 09:30');
    const [dive] = await parseUDDFFile(uddfFile(xml));

    expect(dive.datetime).toBe('2024-03-15T09:30:00');
  });

  it('ignores a trailing timezone offset rather than shifting the time', async () => {
    const xml = sampleUDDF.replace('2024-03-15T09:30:00', '2024-03-15T09:30:00+02:00');
    const [dive] = await parseUDDFFile(uddfFile(xml));

    expect(dive.datetime).toBe('2024-03-15T09:30:00');
  });

  it('sorts samples by time', async () => {
    const [dive] = await parseUDDFFile(uddfFile(sampleUDDF));
    const times = dive.samples!.map(s => s.time);

    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  // A single flat-lining sensor should cost that one reading, not the import.
  it('drops implausible sensor readings but keeps the sample', async () => {
    const xml = sampleUDDF
      .replace('<temperature>295.15</temperature>', '<temperature>0</temperature>')
      .replace('<tankpressure>20000000</tankpressure>', '<tankpressure>-1</tankpressure>');
    const [dive] = await parseUDDFFile(uddfFile(xml));

    expect(dive.samples).toHaveLength(2);
    expect(dive.samples?.[0].temperature).toBeUndefined();
    expect(dive.samples?.[0].pressure).toBeUndefined();
    expect(dive.samples?.[0].depth).toBe(0);
  });

  it('omits optional readings that are absent from the file', async () => {
    const xml = sampleUDDF
      .replace(/<temperature>[^<]*<\/temperature>/g, '')
      .replace(/<tankpressure>[^<]*<\/tankpressure>/g, '');
    const [dive] = await parseUDDFFile(uddfFile(xml));

    expect(dive.samples?.[0].temperature).toBeUndefined();
    expect(dive.samples?.[0].pressure).toBeUndefined();
  });

  it('skips dives with neither depth nor duration', async () => {
    const xml = sampleUDDF
      .replace('<greatestdepth>28.42</greatestdepth>', '<greatestdepth>0</greatestdepth>')
      .replace('<diveduration>2700</diveduration>', '<diveduration>0</diveduration>');

    await expect(parseUDDFFile(uddfFile(xml))).resolves.toEqual([]);
  });

  it('parses multiple dives in one repetition group', async () => {
    const secondDive = `
      <dive id="dive-2">
        <informationbeforedive>
          <datetime>2024-03-16T11:00:00</datetime>
          <link ref="site-1"/>
        </informationbeforedive>
        <informationafterdive>
          <greatestdepth>18.0</greatestdepth>
          <diveduration>3000</diveduration>
        </informationafterdive>
      </dive>`;
    const xml = sampleUDDF.replace('</repetitiongroup>', `${secondDive}</repetitiongroup>`);
    const dives = await parseUDDFFile(uddfFile(xml));

    expect(dives).toHaveLength(2);
    expect(dives.map(d => d.id)).toEqual([1, 2]);
    expect(dives[1].datetime).toBe('2024-03-16T11:00:00');
    expect(dives[1].buddy).toBeUndefined();
  });

  it('falls back to the first known site when the link ref is unknown', async () => {
    const xml = sampleUDDF.replace('<link ref="site-1"/>', '<link ref="site-missing"/>');
    const [dive] = await parseUDDFFile(uddfFile(xml));

    expect(dive.location).toBe('Blue Hole');
  });

  it('falls back to a placeholder location when there are no sites', async () => {
    const xml = sampleUDDF.replace(/<divesite>[\s\S]*<\/divesite>/, '');
    const [dive] = await parseUDDFFile(uddfFile(xml));

    expect(dive.location).toBe('Unknown Location');
    expect(dive.lat).toBe(0);
    expect(dive.lng).toBe(0);
  });

  it('rejects a document with no uddf root', async () => {
    await expect(parseUDDFFile(uddfFile('<notuddf></notuddf>'))).rejects.toThrow(UDDFParseError);
  });

  it('keeps parsing when one dive in the group is malformed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const xml = sampleUDDF.replace('</repetitiongroup>', '<dive id="dive-bad"></dive></repetitiongroup>');

    await expect(parseUDDFFile(uddfFile(xml))).resolves.toHaveLength(1);
    warn.mockRestore();
  });
});

describe('validateUDDFFile', () => {
  it('accepts a non-empty .uddf file', () => {
    expect(validateUDDFFile(uddfFile(sampleUDDF))).toBe(true);
  });

  it('is case-insensitive about the extension', () => {
    expect(validateUDDFFile(uddfFile(sampleUDDF, 'DIVES.UDDF'))).toBe(true);
  });

  it('rejects other extensions', () => {
    expect(validateUDDFFile(uddfFile(sampleUDDF, 'dives.xml'))).toBe(false);
  });

  it('rejects an empty file', () => {
    expect(validateUDDFFile(uddfFile('', 'dives.uddf'))).toBe(false);
  });

  it('rejects files over the 10MB limit', () => {
    const tooBig = new File(['x'], 'dives.uddf');
    Object.defineProperty(tooBig, 'size', { value: 10 * 1024 * 1024 + 1 });

    expect(validateUDDFFile(tooBig)).toBe(false);
  });
});

describe('getUDDFImportSummary', () => {
  const dive = (over: Partial<Dive> = {}): Dive => ({
    id: 1,
    datetime: '2024-03-15T09:30:00',
    location: 'Blue Hole',
    depth: 28.4,
    duration: 45,
    lat: 0,
    lng: 0,
    ...over,
  });

  it('reports when nothing was found', () => {
    expect(getUDDFImportSummary([])).toBe('No valid dives found in UDDF file');
  });

  it('uses singular wording for one dive at one location', () => {
    expect(getUDDFImportSummary([dive()])).toContain('Found 1 dive from 1 location');
  });

  it('uses plural wording and counts distinct locations', () => {
    const summary = getUDDFImportSummary([
      dive(),
      dive({ id: 2, location: 'Thistlegorm' }),
      dive({ id: 3, location: 'Blue Hole' }),
    ]);

    expect(summary).toContain('Found 3 dives from 2 locations');
  });
});

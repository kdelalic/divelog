import { describe, expect, it } from 'vitest';
import type { Dive } from './dives';
import { divesToSubsurfaceXml } from './subsurfaceXmlExport';
import { parseSubsurfaceXML } from './subsurfaceXmlParser';

const dive: Dive = {
  id: 4, diveNumber: 12, datetime: '2026-08-10T09:30:00', location: "Diver's Cove & Reef",
  depth: 30, meanDepth: 18.5, duration: 45, buddy: 'Sam & Alex', lat: 36.5, lng: -121.9,
  diveMode: 'CCR', tags: ['wreck', 'night'], notes: 'Saw <sharks>',
  computer: { vendor: 'Shearwater', model: 'Perdix 2', deviceId: 'abc123' },
  equipment: { tanks: [{ size: 12, working_pressure: 232, start_pressure: 210, end_pressure: 60, gas_mix: { oxygen: 32, name: 'EANx32' } }] },
  samples: [{ time: 0, depth: 0 }, { time: 600, depth: 30, temperature: 18, pressure: 180 }],
};

describe('divesToSubsurfaceXml', () => {
  it('escapes user text and round-trips core native fields', () => {
    const xml = divesToSubsurfaceXml([dive]);
    expect(xml).toContain("name='Diver&apos;s Cove &amp; Reef'");
    expect(xml).toContain('Saw &lt;sharks&gt;');

    const [parsed] = parseSubsurfaceXML(xml);
    expect(parsed).toMatchObject({
      diveNumber: 12, location: dive.location, depth: 30, meanDepth: 18.5,
      duration: 45, buddy: 'Sam & Alex', diveMode: 'CCR', tags: ['wreck', 'night'],
      computer: { vendor: 'Shearwater', model: 'Perdix 2', deviceId: 'abc123' },
    });
    expect(parsed.samples).toHaveLength(2);
    expect(parsed.equipment?.tanks[0].gas_mix.oxygen).toBe(32);
  });
});

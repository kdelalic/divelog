import { describe, expect, it } from 'vitest';
import type { Dive } from './dives';
import { defaultSettings } from './settings';
import type { DiveSite } from './api';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupParseError,
  createDiveLogBackup,
  datedExportFilename,
  divesToCsv,
  parseDiveLogBackup,
  planDiveRestore,
  planDiveSiteRestore,
  serializeDiveLogBackup,
} from './dataTransfer';

const dive = (overrides: Partial<Dive> = {}): Dive => ({
  id: 7,
  datetime: '2026-07-04T09:30:00',
  location: 'Monterey Breakwater',
  depth: 18.4,
	meanDepth: 12.2,
  duration: 47,
  buddy: 'Sam',
  lat: 36.6101,
  lng: -121.891,
  samples: [{ time: 0, depth: 0 }, { time: 600, depth: 18.4, temperature: 12.5 }],
  equipment: {
    tanks: [{
      size: 12,
      working_pressure: 232,
      start_pressure: 210,
      end_pressure: 60,
      gas_mix: { oxygen: 32, nitrogen: 68, name: 'EANx32' },
    }],
    computer: 'Perdix',
  },
  conditions: {
    waterTemp: { surface: 15, bottom: 12.5 },
    visibility: 10,
    current: { strength: 'light', direction: 'incoming' },
  },
  diveType: 'recreational',
	diveMode: 'OC',
	computer: { vendor: 'Shearwater', model: 'Perdix 2', deviceId: 'device-1' },
  rating: 5,
  notes: 'Kelp forest',
  safetyStops: [{ depth: 5, duration: 3 }],
  ...overrides,
});

const site: DiveSite = {
  id: 3,
  name: 'Monterey Breakwater',
  latitude: 36.6101,
  longitude: -121.891,
  description: 'Shore entry',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const asBackupDive = (value: Dive) =>
  createDiveLogBackup([value], [], defaultSettings).data.dives[0];

describe('dive-log backups', () => {
	it('round-trips all user-owned data without server IDs or timestamps', () => {
		const trip = { id: 8, name: 'Red Sea', location: 'Egypt', startDate: '2026-05-01', endDate: '2026-05-07', diveCount: 1 };
		const backedUpDive = dive({ diveNumber: 42, tags: ['wreck', 'nitrox'], trip });
    const backup = createDiveLogBackup(
			[backedUpDive],
      [site],
      defaultSettings,
      new Date('2026-08-08T12:00:00Z'),
			[trip],
			['wreck', 'nitrox', 'unused'],
    );
    const parsed = parseDiveLogBackup(serializeDiveLogBackup(backup));
		const expectedDive = asBackupDive(backedUpDive);

    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.data.dives[0]).toEqual(expectedDive);
    expect(parsed.data.dives[0]).not.toHaveProperty('id');
    expect(parsed.data.diveSites).toEqual([{
      name: site.name,
      latitude: site.latitude,
      longitude: site.longitude,
      description: site.description,
    }]);
    expect(parsed.data.diveSites[0]).not.toHaveProperty('created_at');
    expect(parsed.data.settings).toEqual(defaultSettings);
		expect(parsed.data.dives[0]).toMatchObject({ diveNumber: 42, tags: ['wreck', 'nitrox'], trip: { id: 0, name: 'Red Sea' } });
		expect(parsed.data.dives[0]).toMatchObject({ meanDepth: 12.2, diveMode: 'OC', computer: { model: 'Perdix 2' } });
		expect(parsed.data.trips).toEqual([{ name: 'Red Sea', location: 'Egypt', startDate: '2026-05-01', endDate: '2026-05-07' }]);
		expect(parsed.data.tags).toEqual(['wreck', 'nitrox', 'unused']);
  });

	it('accepts version 1 backups and supplies empty organization collections', () => {
		const legacy = createDiveLogBackup([dive()], [site], defaultSettings);
		legacy.version = 1;
		const data = legacy.data as Partial<typeof legacy.data>;
		delete data.trips;
		delete data.tags;
		const parsed = parseDiveLogBackup(JSON.stringify(legacy));
		expect(parsed.data.trips).toEqual([]);
		expect(parsed.data.tags).toEqual([]);
	});

  it('rejects malformed JSON with a useful error', () => {
    expect(() => parseDiveLogBackup('{bad')).toThrow(BackupParseError);
    expect(() => parseDiveLogBackup('{bad')).toThrow('Backup is not valid JSON');
  });

  it('rejects another JSON document instead of treating it as a backup', () => {
    expect(() => parseDiveLogBackup(JSON.stringify({ dives: [] }))).toThrow(/format/);
  });

  it('reports the path of invalid nested data', () => {
    const backup = createDiveLogBackup([dive()], [site], defaultSettings);
    backup.data.dives[0].depth = -2;
    expect(() => parseDiveLogBackup(JSON.stringify(backup))).toThrow(/data\.dives\.0\.depth/);
  });

  it('rejects timestamps with impossible calendar dates', () => {
    const backup = createDiveLogBackup([dive()], [site], defaultSettings);
    backup.data.dives[0].datetime = '2026-02-30T09:30:00';
    expect(() => parseDiveLogBackup(JSON.stringify(backup))).toThrow(/datetime/);
  });
});

describe('restore planning', () => {
  it('skips dives already present in the logbook', () => {
    const candidate = asBackupDive(dive());
    const plan = planDiveRestore([candidate], [dive({ id: 99 })]);

    expect(plan.dives).toEqual([]);
    expect(plan.duplicateCount).toBe(1);
  });

  it('matches site names case-insensitively and nearby coordinates', () => {
    const candidate = asBackupDive(dive({
      location: '  monterey breakwater ',
      lat: 36.6105,
      lng: -121.8905,
    }));
    const plan = planDiveRestore([candidate], [dive()]);

    expect(plan.duplicateCount).toBe(1);
  });

  it('removes duplicate records within the backup itself', () => {
    const candidate = asBackupDive(dive());
    const plan = planDiveRestore([candidate, structuredClone(candidate)], []);

    expect(plan.dives).toHaveLength(1);
    expect(plan.duplicateCount).toBe(1);
  });

  it('keeps repeat dives at the same site when their start times differ', () => {
    const first = asBackupDive(dive());
    const second = { ...first, datetime: '2026-07-04T11:30:00' };
    expect(planDiveRestore([first, second], []).dives).toHaveLength(2);
  });

  it('skips existing and repeated dive sites', () => {
    const backupSite = {
      name: site.name.toLocaleLowerCase(),
      latitude: site.latitude + 0.0002,
      longitude: site.longitude - 0.0002,
      description: site.description,
    };
    const newSite = { name: 'Blue Hole', latitude: 28.5721, longitude: 34.5372 };
    const plan = planDiveSiteRestore([backupSite, newSite, structuredClone(newSite)], [site]);

    expect(plan.diveSites).toEqual([newSite]);
    expect(plan.duplicateCount).toBe(2);
  });
});

describe('CSV export', () => {
  it('exports metric source values and rich fields', () => {
    const csv = divesToCsv([dive()]);
    expect(csv).toContain('max_depth_m');
		expect(csv).toContain('mean_depth_m');
		expect(csv).toContain('computer_device_id');
    expect(csv).toContain('18.4');
    expect(csv).toContain('water_temp_bottom_c');
    expect(csv).toContain('12.5');
    expect(csv).toContain('"{""tanks""');
    expect(csv).toContain('"[{""time"":0');
		expect(divesToCsv([dive({ diveNumber: 42, tags: ['wreck'], trip: { id: 3, name: 'Red Sea' } })])).toContain('Red Sea');
  });

  it('quotes commas, quotes, and line breaks', () => {
    const csv = divesToCsv([dive({ location: 'Cove, North', notes: 'Line 1\n"Line 2"' })]);
    expect(csv).toContain('"Cove, North"');
    expect(csv).toContain('"Line 1\n""Line 2"""');
  });

  it('protects user-entered spreadsheet formulas', () => {
    const csv = divesToCsv([dive({ buddy: '=HYPERLINK("bad")' })]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  });

  it('emits a header-only CSV for an empty result set', () => {
    expect(divesToCsv([])).toMatch(/^\uFEFFdatetime,.+\r\n$/);
  });
});

describe('datedExportFilename', () => {
  it('uses a stable ISO date', () => {
    const date = new Date('2026-08-08T23:30:00Z');
    expect(datedExportFilename('backup', 'json', date)).toBe('subsurface-web-backup-2026-08-08.json');
    expect(datedExportFilename('dives', 'csv', date)).toBe('dives-2026-08-08.csv');
  });
});

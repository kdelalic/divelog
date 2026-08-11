import type { Dive, Tank } from './dives';

const xmlAttribute = (value: unknown): string => String(value)
  .replace(/&/g, '&amp;')
  .replace(/'/g, '&apos;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const xmlText = (value: unknown): string => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const attribute = (name: string, value: unknown) =>
  value === undefined || value === null || value === '' ? '' : ` ${name}='${xmlAttribute(value)}'`;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')} min`;

const cylinderXml = (tank: Tank) => `    <cylinder${attribute('size', `${tank.size} l`)}${attribute('workpressure', `${tank.working_pressure} bar`)}${attribute('start', `${tank.start_pressure} bar`)}${attribute('end', `${tank.end_pressure} bar`)}${attribute('o2', `${tank.gas_mix.oxygen}%`)}${attribute('he', tank.gas_mix.helium === undefined ? undefined : `${tank.gas_mix.helium}%`)}${attribute('description', tank.name ?? tank.gas_mix.name)} />`;

const diveXml = (dive: Dive, siteID: string): string => {
  const [date, time = '00:00:00'] = dive.datetime.split('T');
  const attributes = [
    attribute('number', dive.diveNumber),
    attribute('divesiteid', siteID),
    attribute('date', date),
    attribute('time', time),
    attribute('duration', clock(dive.duration * 60)),
    attribute('buddy', dive.buddy),
    attribute('rating', dive.rating),
    attribute('tags', dive.tags?.join(',')),
    attribute('divemode', dive.diveMode),
  ].join('');
  const lines = [`  <dive${attributes}>`];
  for (const tank of dive.equipment?.tanks ?? []) lines.push(cylinderXml(tank));
  if (dive.equipment?.weights !== undefined) lines.push(`    <weightsystem weight='${xmlAttribute(`${dive.equipment.weights} kg`)}' />`);
  if (dive.conditions?.waterTemp?.bottom !== undefined || dive.conditions?.airTemp !== undefined) {
    lines.push(`    <divetemperature${attribute('air', dive.conditions.airTemp === undefined ? undefined : `${dive.conditions.airTemp} C`)}${attribute('water', dive.conditions.waterTemp?.bottom === undefined ? undefined : `${dive.conditions.waterTemp.bottom} C`)} />`);
  }
  if (dive.notes) lines.push(`    <notes>${xmlText(dive.notes)}</notes>`);

  const computerAttributes = [
    attribute('vendor', dive.computer?.vendor),
    attribute('model', dive.computer?.model ?? dive.equipment?.computer ?? 'Subsurface Web'),
    attribute('deviceid', dive.computer?.deviceId),
    attribute('serial', dive.computer?.serial),
    attribute('firmware', dive.computer?.firmware),
    attribute('dctype', dive.diveMode),
  ].join('');
  lines.push(`    <divecomputer${computerAttributes}>`);
  lines.push(`      <depth max='${xmlAttribute(`${dive.depth} m`)}'${attribute('mean', dive.meanDepth === undefined ? undefined : `${dive.meanDepth} m`)} />`);
  for (const sample of dive.samples ?? []) {
    lines.push(`      <sample time='${xmlAttribute(clock(sample.time))}' depth='${xmlAttribute(`${sample.depth} m`)}'${attribute('temp', sample.temperature === undefined ? undefined : `${sample.temperature} C`)}${attribute('pressure', sample.pressure === undefined ? undefined : `${sample.pressure} bar`)} />`);
  }
  lines.push('    </divecomputer>');
  lines.push('  </dive>');
  return lines.join('\n');
};

export const divesToSubsurfaceXml = (dives: readonly Dive[]): string => {
  const ordered = [...dives].sort((a, b) => a.datetime.localeCompare(b.datetime) || a.id - b.id);
  const sites = new Map<string, { id: string; name: string; lat: number; lng: number }>();
  for (const dive of ordered) {
    const key = `${dive.location}\u0000${dive.lat}\u0000${dive.lng}`;
    if (!sites.has(key)) sites.set(key, { id: `site-${sites.size + 1}`, name: dive.location, lat: dive.lat, lng: dive.lng });
  }
  const siteID = (dive: Dive) => sites.get(`${dive.location}\u0000${dive.lat}\u0000${dive.lng}`)!.id;
  const lines = [
    `<?xml version='1.0' encoding='UTF-8'?>`,
    `<divelog program='subsurface-web' version='3'>`,
    '  <divesites>',
    ...[...sites.values()].map((site) => `    <site uuid='${site.id}' name='${xmlAttribute(site.name)}' gps='${site.lat} ${site.lng}' />`),
    '  </divesites>',
    '  <dives>',
  ];

  const unassigned = ordered.filter((dive) => !dive.trip);
  lines.push(...unassigned.map((dive) => diveXml(dive, siteID(dive))));
  const trips = new Map<number, Dive[]>();
  for (const dive of ordered) {
    if (!dive.trip) continue;
    const group = trips.get(dive.trip.id) ?? [];
    group.push(dive);
    trips.set(dive.trip.id, group);
  }
  for (const tripDives of trips.values()) {
    const trip = tripDives[0].trip!;
    lines.push(`  <trip${attribute('name', trip.name)}${attribute('location', trip.location)}${attribute('startdate', trip.startDate)}${attribute('enddate', trip.endDate)}>`,
      ...tripDives.map((dive) => diveXml(dive, siteID(dive)).split('\n').map((line) => `  ${line}`).join('\n')),
      '  </trip>');
  }
  lines.push('  </dives>', '</divelog>', '');
  return lines.join('\n');
};

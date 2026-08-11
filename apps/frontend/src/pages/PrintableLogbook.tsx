import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatDiveDateTime } from '@/lib/dateHelpers';
import { formatDuration } from '@/lib/diveStats';
import { diveFiltersFromSearchParams, filterDives, sortDivesNewestFirst } from '@/lib/diveFilters';
import type { DiveSample } from '@/lib/dives';
import { formatDepth, formatPressure, formatTemperature } from '@/lib/unitConversions';
import useDiveStore from '@/store/diveStore';
import useSettingsStore from '@/store/settingsStore';

const PrintableProfile = ({ samples }: { samples?: DiveSample[] }) => {
  if (!samples || samples.length < 2) return <div className="print-profile-empty">No profile data</div>;
  const width = 720;
  const height = 150;
  const maxTime = Math.max(...samples.map((sample) => sample.time), 1);
  const maxDepth = Math.max(...samples.map((sample) => sample.depth), 1);
  const points = samples.map((sample) =>
    `${(sample.time / maxTime) * width},${12 + (sample.depth / maxDepth) * (height - 24)}`,
  ).join(' ');
  return (
    <svg className="print-profile" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Dive depth profile">
      <line x1="0" y1="12" x2={width} y2="12" stroke="currentColor" opacity=".25" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const PrintableLogbook = () => {
  const dives = useDiveStore((state) => state.dives);
  const isLoading = useDiveStore((state) => state.isLoading);
  const settings = useSettingsStore((state) => state.settings);
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const selectedDives = useMemo(() => {
    const filters = diveFiltersFromSearchParams(new URLSearchParams(query));
    return sortDivesNewestFirst(filterDives(dives, filters, settings.units.depth));
  }, [dives, query, settings.units.depth]);

  return (
    <main className="print-logbook">
      <div className="print-controls">
        <div><h1>Printable logbook</h1><p>{selectedDives.length} dive{selectedDives.length === 1 ? '' : 's'} · choose “Save as PDF” in the print dialog for a PDF copy.</p></div>
        <Button onClick={() => window.print()} disabled={selectedDives.length === 0}>Print / Save PDF</Button>
      </div>
      {isLoading && selectedDives.length === 0 && <p className="print-empty">Loading dives…</p>}
      {!isLoading && selectedDives.length === 0 && <p className="print-empty">No dives match this print selection.</p>}
      {selectedDives.map((dive) => (
        <article className="print-dive" key={dive.id}>
          <header className="print-dive-header">
            <div><p className="print-kicker">Dive #{dive.diveNumber ?? '—'}</p><h2>{dive.location}</h2><p>{formatDiveDateTime(dive.datetime, settings)}</p></div>
            <div className="print-rating">{dive.rating ? `${'★'.repeat(dive.rating)}${'☆'.repeat(5 - dive.rating)}` : 'Unrated'}</div>
          </header>
          <dl className="print-facts">
            <div><dt>Maximum depth</dt><dd>{formatDepth(dive.depth, settings.units.depth)}</dd></div>
            <div><dt>Mean depth</dt><dd>{dive.meanDepth === undefined ? '—' : formatDepth(dive.meanDepth, settings.units.depth)}</dd></div>
            <div><dt>Duration</dt><dd>{formatDuration(dive.duration)}</dd></div>
            <div><dt>Surface interval</dt><dd>{dive.surfaceInterval === undefined ? '—' : formatDuration(dive.surfaceInterval)}</dd></div>
            <div><dt>Mode / purpose</dt><dd>{[dive.diveMode, dive.diveType].filter(Boolean).join(' · ') || '—'}</dd></div>
            <div><dt>Buddy</dt><dd>{dive.buddy ?? '—'}</dd></div>
            <div><dt>Trip</dt><dd>{dive.trip?.name ?? '—'}</dd></div>
            <div><dt>Tags</dt><dd>{dive.tags?.join(', ') || '—'}</dd></div>
          </dl>
          <PrintableProfile samples={dive.samples} />
          <div className="print-columns">
            <section><h3>Conditions</h3><p>Water: {dive.conditions?.waterTemp?.bottom === undefined ? '—' : formatTemperature(dive.conditions.waterTemp.bottom, settings.units.temperature)}</p><p>Visibility: {dive.conditions?.visibility === undefined ? '—' : formatDepth(dive.conditions.visibility, settings.units.depth)}</p><p>Current: {dive.conditions?.current?.strength ?? '—'}</p></section>
            <section><h3>Gas &amp; equipment</h3>{dive.equipment?.tanks?.length ? dive.equipment.tanks.map((tank, index) => <p key={index}>{tank.name ?? `Tank ${index + 1}`}: {tank.gas_mix.name ?? `${tank.gas_mix.oxygen}% O₂`} · {formatPressure(tank.start_pressure, settings.units.pressure)} → {formatPressure(tank.end_pressure, settings.units.pressure)}</p>) : <p>—</p>}</section>
          </div>
          {dive.notes && <section className="print-notes"><h3>Notes</h3><p>{dive.notes}</p></section>}
        </article>
      ))}
    </main>
  );
};

export default PrintableLogbook;

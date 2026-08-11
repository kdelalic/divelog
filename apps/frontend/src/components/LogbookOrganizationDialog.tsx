import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import useOrganizationStore from '@/store/organizationStore';
import type { Dive, Trip } from '@/lib/dives';
import type { TripInput } from '@/lib/api';
import { formatDiveDateTime } from '@/lib/dateHelpers';
import useSettingsStore from '@/store/settingsStore';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dives: Dive[];
}

const fieldClassName = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground';
const emptyTrip = (): TripInput => ({ name: '', location: '', startDate: '', endDate: '', notes: '' });

const cleanTrip = (trip: TripInput): TripInput => ({
  name: trip.name.trim(),
  location: trip.location?.trim() || undefined,
  startDate: trip.startDate || undefined,
  endDate: trip.endDate || undefined,
  notes: trip.notes?.trim() || undefined,
});

const LogbookOrganizationDialog = ({ open, onOpenChange, dives }: Props) => {
  const { tags, trips, isLoading, error, load, createTag, updateTag, deleteTag, createTrip, updateTrip, deleteTrip, mergeTrips, splitTrip, renumberDives } = useOrganizationStore();
  const settings = useSettingsStore((state) => state.settings);
  const [tagName, setTagName] = useState('');
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [tripDraft, setTripDraft] = useState<TripInput>(emptyTrip());
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [splitSource, setSplitSource] = useState('');
  const [splitName, setSplitName] = useState('');
  const [splitDiveIds, setSplitDiveIds] = useState<Set<number>>(new Set());
  const [renumberScope, setRenumberScope] = useState<'all' | 'range'>('all');
  const [renumberStart, setRenumberStart] = useState(1);
  const [renumberIncrement, setRenumberIncrement] = useState(1);
  const [renumberFrom, setRenumberFrom] = useState('');
  const [renumberTo, setRenumberTo] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const splitDives = useMemo(
    () => dives.filter((dive) => String(dive.trip?.id ?? '') === splitSource),
    [dives, splitSource],
  );

  const submitTag = async (event: FormEvent) => {
    event.preventDefault();
    if (!tagName.trim()) return;
    if (await createTag(tagName.trim())) setTagName('');
  };

  const beginEditTrip = (trip: Trip) => {
    setEditingTripId(trip.id);
    setTripDraft({ name: trip.name, location: trip.location, startDate: trip.startDate, endDate: trip.endDate, notes: trip.notes });
  };

  const submitTrip = async (event: FormEvent) => {
    event.preventDefault();
    if (!tripDraft.name.trim()) return;
    const saved = editingTripId
      ? await updateTrip(editingTripId, cleanTrip(tripDraft))
      : await createTrip(cleanTrip(tripDraft));
    if (saved) {
      setEditingTripId(null);
      setTripDraft(emptyTrip());
    }
  };

  const performMerge = async () => {
    const source = Number(mergeSource);
    const target = Number(mergeTarget);
    if (!source || !target || source === target) return;
    if (await mergeTrips(target, [source])) {
      setMergeSource('');
      setNotice('Trips merged. The source trip was removed and its dives were reassigned.');
    }
  };

  const performSplit = async () => {
    const source = Number(splitSource);
    if (!source || splitDiveIds.size === 0 || !splitName.trim()) return;
    if (await splitTrip(source, [...splitDiveIds], { name: splitName.trim() })) {
      setSplitDiveIds(new Set());
      setSplitName('');
      setNotice('Selected dives moved into the new trip.');
    }
  };

  const performRenumber = async () => {
    const count = await renumberDives({
      scope: renumberScope,
      startNumber: renumberStart,
      increment: renumberIncrement,
      fromDate: renumberScope === 'range' ? renumberFrom : undefined,
      toDate: renumberScope === 'range' ? renumberTo : undefined,
    });
    if (count !== null) setNotice(`Renumbered ${count} dive${count === 1 ? '' : 's'} in chronological order.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organize logbook</DialogTitle>
          <DialogDescription>Manage reusable tags, trips, assignments, and human-visible dive numbers.</DialogDescription>
        </DialogHeader>
        {(error || notice) && (
          <p role="status" className={`rounded-md border p-3 text-sm ${error ? 'border-red-300 text-red-700 dark:text-red-300' : 'border-green-300 text-green-700 dark:text-green-300'}`}>
            {error ?? notice}
          </p>
        )}
        <Tabs defaultValue="trips">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="numbering">Numbering</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="space-y-5 pt-4">
            <form onSubmit={submitTag} className="flex gap-2">
              <input className={fieldClassName} value={tagName} onChange={(event) => setTagName(event.target.value)} placeholder="New tag name" maxLength={100} />
              <Button type="submit" disabled={isLoading || !tagName.trim()}>Add tag</Button>
            </form>
            <div className="divide-y divide-border rounded-md border border-border">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between gap-3 p-3">
                  <div><span className="font-medium">{tag.name}</span> <span className="text-sm text-muted-foreground">({tag.diveCount} dives)</span></div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const name = window.prompt('Rename tag', tag.name)?.trim();
                      if (name && name !== tag.name) void updateTag(tag.id, name);
                    }}>Rename</Button>
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => {
                      if (window.confirm(`Delete “${tag.name}”? It will be removed from every dive.`)) void deleteTag(tag.id);
                    }}>Delete</Button>
                  </div>
                </div>
              ))}
              {tags.length === 0 && <p className="p-4 text-sm text-muted-foreground">No reusable tags yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="trips" className="space-y-7 pt-4">
            <form onSubmit={submitTrip} className="space-y-3 rounded-md border border-border p-4">
              <h3 className="font-semibold">{editingTripId ? 'Edit trip' : 'Add trip'}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={fieldClassName} value={tripDraft.name} onChange={(event) => setTripDraft({ ...tripDraft, name: event.target.value })} placeholder="Trip name" maxLength={255} required />
                <input className={fieldClassName} value={tripDraft.location ?? ''} onChange={(event) => setTripDraft({ ...tripDraft, location: event.target.value })} placeholder="Location" maxLength={255} />
                <input aria-label="Trip start date" type="date" className={fieldClassName} value={tripDraft.startDate ?? ''} onChange={(event) => setTripDraft({ ...tripDraft, startDate: event.target.value })} />
                <input aria-label="Trip end date" type="date" className={fieldClassName} min={tripDraft.startDate} value={tripDraft.endDate ?? ''} onChange={(event) => setTripDraft({ ...tripDraft, endDate: event.target.value })} />
              </div>
              <textarea className={fieldClassName} value={tripDraft.notes ?? ''} onChange={(event) => setTripDraft({ ...tripDraft, notes: event.target.value })} placeholder="Trip notes" rows={2} maxLength={10000} />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>{editingTripId ? 'Save trip' : 'Create trip'}</Button>
                {editingTripId && <Button type="button" variant="outline" onClick={() => { setEditingTripId(null); setTripDraft(emptyTrip()); }}>Cancel</Button>}
              </div>
            </form>

            <div className="divide-y divide-border rounded-md border border-border">
              {trips.map((trip) => (
                <div key={trip.id} className="flex items-start justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">{trip.name} <span className="text-sm font-normal text-muted-foreground">({trip.diveCount ?? 0} dives)</span></p>
                    <p className="text-sm text-muted-foreground">{[trip.location, trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : trip.startDate].filter(Boolean).join(' · ') || 'No trip details'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => beginEditTrip(trip)}>Edit</Button>
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => {
                      if (window.confirm(`Delete “${trip.name}”? Its dives will become unassigned.`)) void deleteTrip(trip.id);
                    }}>Delete</Button>
                  </div>
                </div>
              ))}
              {trips.length === 0 && <p className="p-4 text-sm text-muted-foreground">No trips yet.</p>}
            </div>

            <section className="space-y-3 rounded-md border border-border p-4">
              <h3 className="font-semibold">Merge trips</h3>
              <p className="text-sm text-muted-foreground">Move every dive from one trip into another and remove the source trip.</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <select aria-label="Source trip" className={fieldClassName} value={mergeSource} onChange={(event) => setMergeSource(event.target.value)}><option value="">Source trip</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select>
                <select aria-label="Target trip" className={fieldClassName} value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)}><option value="">Target trip</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select>
                <Button type="button" onClick={performMerge} disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget || isLoading}>Merge</Button>
              </div>
            </section>

            <section className="space-y-3 rounded-md border border-border p-4">
              <h3 className="font-semibold">Split a trip</h3>
              <select aria-label="Trip to split" className={fieldClassName} value={splitSource} onChange={(event) => { setSplitSource(event.target.value); setSplitDiveIds(new Set()); }}><option value="">Choose a trip</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select>
              {splitSource && <div className="max-h-52 space-y-1 overflow-y-auto rounded border border-border p-2">{splitDives.map((dive) => <label key={dive.id} className="flex items-center gap-2 rounded p-2 hover:bg-muted"><input type="checkbox" checked={splitDiveIds.has(dive.id)} onChange={(event) => setSplitDiveIds((current) => { const next = new Set(current); if (event.target.checked) next.add(dive.id); else next.delete(dive.id); return next; })} /><span>#{dive.diveNumber ?? '—'} · {formatDiveDateTime(dive.datetime, settings)} · {dive.location}</span></label>)}</div>}
              <div className="flex gap-2"><input className={fieldClassName} value={splitName} onChange={(event) => setSplitName(event.target.value)} placeholder="New trip name" /><Button type="button" onClick={performSplit} disabled={!splitSource || splitDiveIds.size === 0 || !splitName.trim() || isLoading}>Split selected dives</Button></div>
            </section>
          </TabsContent>

          <TabsContent value="numbering" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">Numbers are assigned oldest-to-newest and remain independent from database IDs.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className={fieldClassName} value={renumberScope} onChange={(event) => setRenumberScope(event.target.value as 'all' | 'range')}><option value="all">All dives</option><option value="range">Date range</option></select>
              <input aria-label="Starting dive number" type="number" min={1} className={fieldClassName} value={renumberStart} onChange={(event) => setRenumberStart(Number(event.target.value))} />
              <input aria-label="Number increment" type="number" min={1} className={fieldClassName} value={renumberIncrement} onChange={(event) => setRenumberIncrement(Number(event.target.value))} />
            </div>
            {renumberScope === 'range' && <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Renumber from date" type="date" className={fieldClassName} value={renumberFrom} onChange={(event) => setRenumberFrom(event.target.value)} /><input aria-label="Renumber to date" type="date" min={renumberFrom} className={fieldClassName} value={renumberTo} onChange={(event) => setRenumberTo(event.target.value)} /></div>}
            <Button type="button" onClick={performRenumber} disabled={isLoading || renumberStart < 1 || renumberIncrement < 1 || (renumberScope === 'range' && (!renumberFrom || !renumberTo))}>Renumber dives</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LogbookOrganizationDialog;

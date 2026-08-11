import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Dive } from '@/lib/dives';
import type { UserSettings } from '@/lib/settings';
import { formatDiveDateTime, shiftDiveDateTime } from '@/lib/dateHelpers';

interface ShiftDiveTimesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dives: Dive[];
  settings: UserSettings;
  onApply: (offsetMinutes: number) => Promise<boolean>;
}

const ShiftDiveTimesDialog = ({ open, onOpenChange, dives, settings, onApply }: ShiftDiveTimesDialogProps) => {
  const [direction, setDirection] = useState('later');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const magnitude = Math.min(10080, Math.max(0, Number(hours || 0) * 60 + Number(minutes || 0)));
  const offset = (direction === 'earlier' ? -1 : 1) * magnitude;
  const preview = useMemo(() => dives.slice(0, 6).map((dive) => ({
    dive,
    shifted: shiftDiveDateTime(dive.datetime, offset),
  })), [dives, offset]);

  const close = (next: boolean) => {
    if (saving) return;
    if (!next) setError(null);
    onOpenChange(next);
  };
  const apply = async () => {
    setSaving(true);
    setError(null);
    const success = await onApply(offset);
    setSaving(false);
    if (success) onOpenChange(false); else setError('The timestamps could not be shifted. Check for duplicate dive times.');
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shift {dives.length} dive timestamp{dives.length === 1 ? '' : 's'}</DialogTitle>
          <DialogDescription>Correct a dive-computer clock or timezone offset. You can undo this operation afterward.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>Direction</Label><Select value={direction} onValueChange={setDirection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="later">Move later</SelectItem><SelectItem value="earlier">Move earlier</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="shift-hours">Hours</Label><Input id="shift-hours" type="number" min="0" max="168" value={hours} onChange={(event) => setHours(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="shift-minutes">Minutes</Label><Input id="shift-minutes" type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></div>
        </div>
        <div className="max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Dive</th><th className="px-3 py-2 text-left">Before</th><th className="px-3 py-2 text-left">After</th></tr></thead>
            <tbody>{preview.map(({ dive, shifted }) => <tr key={dive.id} className="border-t border-border"><td className="px-3 py-2">#{dive.diveNumber ?? dive.id} · {dive.location}</td><td className="px-3 py-2">{formatDiveDateTime(dive.datetime, settings)}</td><td className="px-3 py-2 font-medium">{formatDiveDateTime(shifted, settings)}</td></tr>)}</tbody>
          </table>
          {dives.length > preview.length && <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">And {dives.length - preview.length} more dives</p>}
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <DialogFooter><Button variant="outline" onClick={() => close(false)} disabled={saving}>Cancel</Button><Button onClick={apply} disabled={magnitude === 0 || saving}>{saving ? 'Shifting…' : `Shift ${direction}`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDiveTimesDialog;

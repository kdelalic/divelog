import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BulkDiveUpdateInput } from '@/lib/api';
import type { Trip } from '@/lib/dives';

interface BulkDiveEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  diveIds: number[];
  trips: Trip[];
  onApply: (request: BulkDiveUpdateInput) => Promise<boolean>;
}

const parseTags = (value: string) => [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];

const BulkDiveEditDialog = ({
  open, onOpenChange, selectedCount, diveIds, trips, onApply,
}: BulkDiveEditDialogProps) => {
  const [trip, setTrip] = useState('unchanged');
  const [buddy, setBuddy] = useState('');
  const [buddyMode, setBuddyMode] = useState('unchanged');
  const [diveType, setDiveType] = useState('unchanged');
  const [rating, setRating] = useState('unchanged');
  const [addTags, setAddTags] = useState('');
  const [removeTags, setRemoveTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = useMemo(() =>
    trip !== 'unchanged' || buddyMode !== 'unchanged' || diveType !== 'unchanged' ||
    rating !== 'unchanged' || parseTags(addTags).length > 0 || parseTags(removeTags).length > 0,
  [trip, buddyMode, diveType, rating, addTags, removeTags]);

  const reset = () => {
    setTrip('unchanged');
    setBuddy('');
    setBuddyMode('unchanged');
    setDiveType('unchanged');
    setRating('unchanged');
    setAddTags('');
    setRemoveTags('');
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const apply = async () => {
    setSaving(true);
    setError(null);
    const request: BulkDiveUpdateInput = {
      diveIds,
      tripId: trip.startsWith('trip:') ? Number(trip.slice(5)) : undefined,
      clearTrip: trip === 'clear' || undefined,
      addTags: parseTags(addTags),
      removeTags: parseTags(removeTags),
      buddy: buddyMode === 'set' ? buddy.trim() : undefined,
      clearBuddy: buddyMode === 'clear' || undefined,
      diveType: diveType !== 'unchanged' && diveType !== 'clear'
        ? diveType as BulkDiveUpdateInput['diveType'] : undefined,
      clearDiveType: diveType === 'clear' || undefined,
      rating: rating !== 'unchanged' && rating !== 'clear' ? Number(rating) : undefined,
      clearRating: rating === 'clear' || undefined,
    };
    const success = await onApply(request);
    setSaving(false);
    if (success) {
      reset();
      onOpenChange(false);
    } else {
      setError('The selected dives could not be updated.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {selectedCount} selected dive{selectedCount === 1 ? '' : 's'}</DialogTitle>
          <DialogDescription>Only the fields changed below will be applied to the selection.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Trip</Label>
            <Select value={trip} onValueChange={setTrip}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Leave unchanged</SelectItem>
                <SelectItem value="clear">Remove from trip</SelectItem>
                {trips.map((item) => <SelectItem key={item.id} value={`trip:${item.id}`}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Buddy</Label>
            <Select value={buddyMode} onValueChange={setBuddyMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Leave unchanged</SelectItem>
                <SelectItem value="set">Set buddy</SelectItem>
                <SelectItem value="clear">Clear buddy</SelectItem>
              </SelectContent>
            </Select>
            {buddyMode === 'set' && <Input value={buddy} onChange={(event) => setBuddy(event.target.value)} placeholder="Buddy name" />}
          </div>
          <div className="space-y-2">
            <Label>Dive type</Label>
            <Select value={diveType} onValueChange={setDiveType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Leave unchanged</SelectItem>
                <SelectItem value="clear">Clear type</SelectItem>
                {['recreational', 'training', 'technical', 'work', 'research'].map((value) => (
                  <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Leave unchanged</SelectItem>
                <SelectItem value="clear">Clear rating</SelectItem>
                {[1, 2, 3, 4, 5].map((value) => <SelectItem key={value} value={String(value)}>{value} star{value === 1 ? '' : 's'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-add-tags">Add tags</Label>
            <Input id="bulk-add-tags" value={addTags} onChange={(event) => setAddTags(event.target.value)} placeholder="wreck, night" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-remove-tags">Remove tags</Label>
            <Input id="bulk-remove-tags" value={removeTags} onChange={(event) => setRemoveTags(event.target.value)} placeholder="training" />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={apply} disabled={!hasChanges || saving || (buddyMode === 'set' && !buddy.trim())}>
            {saving ? 'Applying…' : 'Apply changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDiveEditDialog;

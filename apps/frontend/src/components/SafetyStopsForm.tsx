import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SafetyStop } from '@/lib/dives';
import useSettingsStore from '@/store/settingsStore';
import { convertDepth } from '@/lib/unitConversions';
import { unitLabels } from '@/lib/settings';

interface SafetyStopsFormProps {
  safetyStops: SafetyStop[];
  onChange: (stops: SafetyStop[]) => void;
}

// Depth is stored/communicated in meters; displayed in the user's preferred unit.
const SafetyStopsForm: React.FC<SafetyStopsFormProps> = ({ safetyStops, onChange }) => {
  const { settings } = useSettingsStore();
  const depthLabel = unitLabels.depth[settings.units.depth];

  const addStop = () => {
    const defaultDepth = convertDepth(5, 'meters', settings.units.depth);
    onChange([...safetyStops, { depth: convertDepth(defaultDepth, settings.units.depth, 'meters'), duration: 3 }]);
  };

  const updateStop = (index: number, updates: Partial<SafetyStop>) => {
    const next = [...safetyStops];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const removeStop = (index: number) => {
    onChange(safetyStops.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {safetyStops.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p>No safety stops recorded</p>
        </div>
      ) : (
        safetyStops.map((stop, index) => {
          const depthInUserUnits = convertDepth(stop.depth, 'meters', settings.units.depth);
          return (
            <div key={index} className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor={`safety-stop-${index}-depth`}>Depth ({depthLabel})</Label>
                <Input
                  id={`safety-stop-${index}-depth`}
                  type="number"
                  step="0.1"
                  min="0"
                  value={depthInUserUnits}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    updateStop(index, { depth: convertDepth(value, settings.units.depth, 'meters') });
                  }}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor={`safety-stop-${index}-duration`}>Duration (min)</Label>
                <Input
                  id={`safety-stop-${index}-duration`}
                  type="number"
                  min="0"
                  value={stop.duration}
                  onChange={(e) => updateStop(index, { duration: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => removeStop(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })
      )}
      <Button onClick={addStop} type="button" size="sm" variant="outline" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Safety Stop
      </Button>
    </div>
  );
};

export default SafetyStopsForm;

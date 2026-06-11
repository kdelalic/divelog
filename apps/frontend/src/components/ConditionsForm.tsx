import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DiveConditions } from '@/lib/dives';
import useSettingsStore from '@/store/settingsStore';
import { convertDepth, convertTemperature } from '@/lib/unitConversions';
import { unitLabels } from '@/lib/settings';

interface ConditionsFormProps {
  conditions?: DiveConditions;
  onChange: (conditions: DiveConditions) => void;
}

// All numeric values are stored/communicated in metric (celsius, meters);
// this component converts to/from the user's preferred units at its boundary.
const ConditionsForm: React.FC<ConditionsFormProps> = ({ conditions, onChange }) => {
  const { settings } = useSettingsStore();

  const toUserUnits = (c?: DiveConditions): DiveConditions => {
    if (!c) return {};
    return {
      ...c,
      water_temp_surface: c.water_temp_surface !== undefined
        ? convertTemperature(c.water_temp_surface, 'celsius', settings.units.temperature)
        : undefined,
      water_temp_bottom: c.water_temp_bottom !== undefined
        ? convertTemperature(c.water_temp_bottom, 'celsius', settings.units.temperature)
        : undefined,
      air_temp: c.air_temp !== undefined
        ? convertTemperature(c.air_temp, 'celsius', settings.units.temperature)
        : undefined,
      visibility: c.visibility !== undefined
        ? convertDepth(c.visibility, 'meters', settings.units.depth)
        : undefined,
    };
  };

  const toMetricUnits = (c: DiveConditions): DiveConditions => {
    return {
      ...c,
      water_temp_surface: c.water_temp_surface !== undefined
        ? convertTemperature(c.water_temp_surface, settings.units.temperature, 'celsius')
        : undefined,
      water_temp_bottom: c.water_temp_bottom !== undefined
        ? convertTemperature(c.water_temp_bottom, settings.units.temperature, 'celsius')
        : undefined,
      air_temp: c.air_temp !== undefined
        ? convertTemperature(c.air_temp, settings.units.temperature, 'celsius')
        : undefined,
      visibility: c.visibility !== undefined
        ? convertDepth(c.visibility, settings.units.depth, 'meters')
        : undefined,
    };
  };

  const [current, setCurrent] = useState<DiveConditions>(toUserUnits(conditions));

  const update = (updates: Partial<DiveConditions>) => {
    const next = { ...current, ...updates };
    setCurrent(next);
    onChange(toMetricUnits(next));
  };

  const tempLabel = unitLabels.temperature[settings.units.temperature];
  const depthLabel = unitLabels.depth[settings.units.depth];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Water Conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="water-temp-surface">Surface Temp ({tempLabel})</Label>
            <Input
              id="water-temp-surface"
              type="number"
              step="0.1"
              value={current.water_temp_surface ?? ''}
              onChange={(e) => update({ water_temp_surface: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="water-temp-bottom">Bottom Temp ({tempLabel})</Label>
            <Input
              id="water-temp-bottom"
              type="number"
              step="0.1"
              value={current.water_temp_bottom ?? ''}
              onChange={(e) => update({ water_temp_bottom: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility ({depthLabel})</Label>
            <Input
              id="visibility"
              type="number"
              step="0.1"
              min="0"
              value={current.visibility ?? ''}
              onChange={(e) => update({ visibility: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-strength">Current</Label>
            <Select
              value={current.current_strength || 'none'}
              onValueChange={(value: string) => update({ current_strength: value as DiveConditions['current_strength'] })}
            >
              <SelectTrigger id="current-strength">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-direction">Current Direction</Label>
            <Input
              id="current-direction"
              value={current.current_direction || ''}
              onChange={(e) => update({ current_direction: e.target.value || undefined })}
              placeholder="e.g. NE, incoming"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="surge">Surge</Label>
            <Select
              value={current.surge || 'none'}
              onValueChange={(value: string) => update({ surge: value as DiveConditions['surge'] })}
            >
              <SelectTrigger id="surge">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weather Conditions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="air-temp">Air Temp ({tempLabel})</Label>
            <Input
              id="air-temp"
              type="number"
              step="0.1"
              value={current.air_temp ?? ''}
              onChange={(e) => update({ air_temp: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weather">Weather</Label>
            <Select
              value={current.weather || 'sunny'}
              onValueChange={(value: string) => update({ weather: value as DiveConditions['weather'] })}
            >
              <SelectTrigger id="weather">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunny">Sunny</SelectItem>
                <SelectItem value="cloudy">Cloudy</SelectItem>
                <SelectItem value="overcast">Overcast</SelectItem>
                <SelectItem value="rainy">Rainy</SelectItem>
                <SelectItem value="windy">Windy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sea-state">Sea State (0-9)</Label>
            <Input
              id="sea-state"
              type="number"
              min="0"
              max="9"
              value={current.sea_state ?? ''}
              onChange={(e) => update({ sea_state: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConditionsForm;

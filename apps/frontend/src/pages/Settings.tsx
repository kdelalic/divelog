import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useSettingsStore from '../store/settingsStore';
import type { DepthUnit, TemperatureUnit, DistanceUnit, WeightUnit, PressureUnit } from '../lib/settings';

const Settings = () => {
  const { settings, updateUnitSettings, updatePreferences, updateDiveSettings, resetToDefaults } = useSettingsStore();

  const handleUnitChange = (unitType: keyof typeof settings.units, value: string) => {
    updateUnitSettings({ [unitType]: value });
  };

  const handlePreferenceChange = (prefType: keyof typeof settings.preferences, value: string | boolean) => {
    updatePreferences({ [prefType]: value });
  };

  const handleDiveSettingChange = (settingType: keyof typeof settings.dive, value: string | boolean | number) => {
    updateDiveSettings({ [settingType]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h2>
          <p className="text-muted-foreground">Customize your dive log preferences and units</p>
        </div>
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      <Tabs defaultValue="units" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="units">Units & Measurements</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="diving">Diving Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unit Preferences</CardTitle>
              <CardDescription>
                Choose your preferred units for displaying dive data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Depth</label>
                  <select
                    value={settings.units.depth}
                    onChange={(e) => handleUnitChange('depth', e.target.value as DepthUnit)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="meters">Meters (m)</option>
                    <option value="feet">Feet (ft)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Temperature</label>
                  <select
                    value={settings.units.temperature}
                    onChange={(e) => handleUnitChange('temperature', e.target.value as TemperatureUnit)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="celsius">Celsius (°C)</option>
                    <option value="fahrenheit">Fahrenheit (°F)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Distance</label>
                  <select
                    value={settings.units.distance}
                    onChange={(e) => handleUnitChange('distance', e.target.value as DistanceUnit)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kilometers">Kilometers (km)</option>
                    <option value="miles">Miles (mi)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Weight</label>
                  <select
                    value={settings.units.weight}
                    onChange={(e) => handleUnitChange('weight', e.target.value as WeightUnit)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kilograms">Kilograms (kg)</option>
                    <option value="pounds">Pounds (lbs)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pressure</label>
                  <select
                    value={settings.units.pressure}
                    onChange={(e) => handleUnitChange('pressure', e.target.value as PressureUnit)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bar">Bar</option>
                    <option value="psi">PSI</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize how dates, times, and other information is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Format</label>
                  <select
                    value={settings.preferences.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ISO">ISO (YYYY-MM-DD)</option>
                    <option value="US">US (MM/DD/YYYY)</option>
                    <option value="EU">European (DD/MM/YYYY)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Format</label>
                  <select
                    value={settings.preferences.timeFormat}
                    onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="24h">24 Hour (14:30)</option>
                    <option value="12h">12 Hour (2:30 PM)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Visibility</label>
                  <select
                    value={settings.preferences.defaultVisibility}
                    onChange={(e) => handlePreferenceChange('defaultVisibility', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diving" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Diving Settings</CardTitle>
              <CardDescription>
                Configure dive-specific preferences and safety settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Show Buddy Reminders</label>
                    <p className="text-xs text-muted-foreground">Remind to add buddy information</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dive.showBuddyReminders}
                    onChange={(e) => handleDiveSettingChange('showBuddyReminders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Auto-calculate Nitrox</label>
                    <p className="text-xs text-muted-foreground">Automatically calculate gas mix benefits</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dive.autoCalculateNitrox}
                    onChange={(e) => handleDiveSettingChange('autoCalculateNitrox', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Gas Mix</label>
                  <select
                    value={settings.dive.defaultGasMix}
                    onChange={(e) => handleDiveSettingChange('defaultGasMix', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Air (21% O₂)">Air (21% O₂)</option>
                    <option value="Nitrox 32 (32% O₂)">Nitrox 32 (32% O₂)</option>
                    <option value="Nitrox 36 (36% O₂)">Nitrox 36 (36% O₂)</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Max Depth Warning ({settings.units.depth === 'meters' ? 'm' : 'ft'})
                  </label>
                  <input
                    type="number"
                    value={settings.dive.maxDepthWarning}
                    onChange={(e) => handleDiveSettingChange('maxDepthWarning', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max={settings.units.depth === 'meters' ? '100' : '330'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Warning shown when planning dives deeper than this limit
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
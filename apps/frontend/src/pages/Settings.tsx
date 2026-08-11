import { Settings as SettingsIcon, CloudOff, Cloud, Loader2, RefreshCw, AlertCircle, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useSettingsStore from '../store/settingsStore';
import type { DepthUnit, TemperatureUnit, DistanceUnit, WeightUnit, PressureUnit, VolumeUnit, UnitPreference } from '../lib/settings';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const fieldClassName = 'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { 
    settings, 
    updateUnitPreference,
    updateUnitSettings, 
    updatePreferences, 
    updateDiveSettings, 
    resetToDefaults,
    isLoading,
    isOnline,
    error,
    loadFromBackend,
  } = useSettingsStore();

  // Load settings from backend on component mount
  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  const handleUnitPreferenceChange = (preference: UnitPreference) => {
    updateUnitPreference(preference);
  };

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
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div className="space-y-3">
          <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight text-foreground">
            <SettingsIcon className="h-9 w-9 text-muted-foreground" />
            Settings
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          </h1>
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground">Customize your dive log preferences and units</p>
            <div className="flex items-center gap-4 text-sm">
              {isOnline ? (
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-green-700 dark:bg-green-950/50 dark:text-green-300">
                  <Cloud className="h-4 w-4" />
                  <span className="font-medium">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                  <CloudOff className="h-4 w-4" />
                  <span className="font-medium">Offline</span>
                </div>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            size="lg"
            onClick={loadFromBackend}
            disabled={isLoading || !isOnline}
            className="px-6"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={resetToDefaults}
            disabled={isLoading}
            className="px-6"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Tabs defaultValue="units" className="w-full space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="units">Units & Measurements</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="diving">Diving Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="units">
          <Card>
            <CardHeader>
              <CardTitle>Unit Preferences</CardTitle>
              <CardDescription>
                Choose your preferred units for displaying dive data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit System</label>
                  <select
                    value={settings.unitPreference}
                    onChange={(e) => handleUnitPreferenceChange(e.target.value as UnitPreference)}
                    className={fieldClassName}
                  >
                    <option value="metric">Metric (meters, celsius, bar, etc.)</option>
                    <option value="imperial">Imperial (feet, fahrenheit, psi, etc.)</option>
                    <option value="customize">Customize (choose individual units)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {settings.unitPreference === 'customize' 
                      ? 'Individual unit settings below are enabled'
                      : 'Individual unit settings are overridden by the selected preset'
                    }
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Depth</label>
                  <select
                    value={settings.units.depth}
                    onChange={(e) => handleUnitChange('depth', e.target.value as DepthUnit)}
                    disabled={settings.unitPreference !== 'customize'}
                    className={fieldClassName}
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
                    disabled={settings.unitPreference !== 'customize'}
                    className={fieldClassName}
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
                    disabled={settings.unitPreference !== 'customize'}
                    className={fieldClassName}
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
                    disabled={settings.unitPreference !== 'customize'}
                    className={fieldClassName}
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
                    disabled={settings.unitPreference !== 'customize'}
                    className={fieldClassName}
                  >
                    <option value="bar">Bar</option>
                    <option value="psi">PSI</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tank Volume</label>
                  <select
                    value={settings.units.volume}
                    onChange={(e) => handleUnitChange('volume', e.target.value as VolumeUnit)}
                    disabled={settings.unitPreference !== 'customize'}
                    className={fieldClassName}
                  >
                    <option value="liters">Liters (L)</option>
                    <option value="cubic_feet">Cubic Feet (ft³)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Choose a theme for this browser. System follows your device automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {([
                  { value: 'light' as const, label: 'Light', description: 'Always use the light theme', icon: Sun },
                  { value: 'dark' as const, label: 'Dark', description: 'Always use the dark theme', icon: Moon },
                  { value: 'system' as const, label: 'System', description: 'Match this device setting', icon: Monitor },
                ]).map((option) => {
                  const Icon = option.icon;
                  const selected = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-32 flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-blue-500 bg-blue-50 text-blue-950 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-100'
                          : 'border-border bg-card text-card-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span>
                        <span className="block font-semibold">{option.label}</span>
                        <span className={cn(
                          'mt-1 block text-sm',
                          selected ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground',
                        )}>
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize how dates, times, and other information is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Format</label>
                  <select
                    value={settings.preferences.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                    className={fieldClassName}
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
                    className={fieldClassName}
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
                    className={fieldClassName}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diving">
          <Card>
            <CardHeader>
              <CardTitle>Diving Settings</CardTitle>
              <CardDescription>
                Configure dive-specific preferences and safety settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Show Buddy Reminders</label>
                    <p className="text-xs text-muted-foreground">Remind to add buddy information</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dive.showBuddyReminders}
                    onChange={(e) => handleDiveSettingChange('showBuddyReminders', e.target.checked)}
                    className="h-4 w-4 rounded border-input bg-background text-blue-600 focus:ring-blue-500"
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
                    className="h-4 w-4 rounded border-input bg-background text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Gas Mix</label>
                  <select
                    value={settings.dive.defaultGasMix}
                    onChange={(e) => handleDiveSettingChange('defaultGasMix', e.target.value)}
                    className={fieldClassName}
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
                    className={fieldClassName}
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

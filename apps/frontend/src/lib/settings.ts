export type DepthUnit = 'meters' | 'feet';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type DistanceUnit = 'kilometers' | 'miles';
export type WeightUnit = 'kilograms' | 'pounds';
export type PressureUnit = 'bar' | 'psi';
export type VolumeUnit = 'liters' | 'cubic_feet';

export interface UserSettings {
  units: {
    depth: DepthUnit;
    temperature: TemperatureUnit;
    distance: DistanceUnit;
    weight: WeightUnit;
    pressure: PressureUnit;
    volume: VolumeUnit;
  };
  preferences: {
    dateFormat: 'ISO' | 'US' | 'EU';
    timeFormat: '12h' | '24h';
    defaultVisibility: 'private' | 'public';
  };
  dive: {
    showBuddyReminders: boolean;
    autoCalculateNitrox: boolean;
    defaultGasMix: string;
    maxDepthWarning: number; // in user's preferred depth unit
  };
}

export const defaultSettings: UserSettings = {
  units: {
    depth: 'meters',
    temperature: 'celsius',
    distance: 'kilometers',
    weight: 'kilograms',
    pressure: 'bar',
    volume: 'liters',
  },
  preferences: {
    dateFormat: 'ISO',
    timeFormat: '24h',
    defaultVisibility: 'private',
  },
  dive: {
    showBuddyReminders: true,
    autoCalculateNitrox: false,
    defaultGasMix: 'Air (21% O₂)',
    maxDepthWarning: 40, // 40 meters by default
  },
};

export const unitLabels = {
  depth: {
    meters: 'm',
    feet: 'ft',
  },
  temperature: {
    celsius: '°C',
    fahrenheit: '°F',
  },
  distance: {
    kilometers: 'km',
    miles: 'mi',
  },
  weight: {
    kilograms: 'kg',
    pounds: 'lbs',
  },
  pressure: {
    bar: 'bar',
    psi: 'psi',
  },
  volume: {
    liters: 'L',
    cubic_feet: 'ft³',
  },
} as const;
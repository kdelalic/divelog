import type { DepthUnit, TemperatureUnit, DistanceUnit, WeightUnit, PressureUnit, VolumeUnit } from './settings';

// Depth conversions
export const convertDepth = (value: number, from: DepthUnit, to: DepthUnit): number => {
  if (from === to) return value;
  
  if (from === 'meters' && to === 'feet') {
    return Math.round((value * 3.28084) * 10) / 10;
  }
  if (from === 'feet' && to === 'meters') {
    return Math.round((value * 0.3048) * 10) / 10;
  }
  
  return value;
};

export const formatDepth = (value: number, unit: DepthUnit, precision: number = 1): string => {
  // Database stores in meters, so convert if user wants feet
  const convertedValue = unit === 'feet' ? convertDepth(value, 'meters', 'feet') : value;
  const label = unit === 'meters' ? 'm' : 'ft';
  return `${convertedValue.toFixed(precision)}${label}`;
};

// Temperature conversions
export const convertTemperature = (value: number, from: TemperatureUnit, to: TemperatureUnit): number => {
  if (from === to) return value;
  
  if (from === 'celsius' && to === 'fahrenheit') {
    return Math.round(((value * 9/5) + 32) * 10) / 10;
  }
  if (from === 'fahrenheit' && to === 'celsius') {
    return Math.round(((value - 32) * 5/9) * 10) / 10;
  }
  
  return value;
};

export const formatTemperature = (value: number, unit: TemperatureUnit, precision: number = 1): string => {
  // Database stores in celsius, so convert if user wants fahrenheit
  const convertedValue = unit === 'fahrenheit' ? convertTemperature(value, 'celsius', 'fahrenheit') : value;
  const label = unit === 'celsius' ? '°C' : '°F';
  return `${convertedValue.toFixed(precision)}${label}`;
};

// Distance conversions
export const convertDistance = (value: number, from: DistanceUnit, to: DistanceUnit): number => {
  if (from === to) return value;
  
  if (from === 'kilometers' && to === 'miles') {
    return Math.round((value * 0.621371) * 10) / 10;
  }
  if (from === 'miles' && to === 'kilometers') {
    return Math.round((value * 1.60934) * 10) / 10;
  }
  
  return value;
};

export const formatDistance = (value: number, unit: DistanceUnit, precision: number = 1): string => {
  // Database stores in kilometers, so convert if user wants miles
  const convertedValue = unit === 'miles' ? convertDistance(value, 'kilometers', 'miles') : value;
  const label = unit === 'kilometers' ? 'km' : 'mi';
  return `${convertedValue.toFixed(precision)}${label}`;
};

// Weight conversions
export const convertWeight = (value: number, from: WeightUnit, to: WeightUnit): number => {
  if (from === to) return value;
  
  if (from === 'kilograms' && to === 'pounds') {
    return Math.round((value * 2.20462) * 10) / 10;
  }
  if (from === 'pounds' && to === 'kilograms') {
    return Math.round((value * 0.453592) * 10) / 10;
  }
  
  return value;
};

export const formatWeight = (value: number, unit: WeightUnit, precision: number = 1): string => {
  // Database stores in kilograms, so convert if user wants pounds
  const convertedValue = unit === 'pounds' ? convertWeight(value, 'kilograms', 'pounds') : value;
  const label = unit === 'kilograms' ? 'kg' : 'lbs';
  return `${convertedValue.toFixed(precision)}${label}`;
};

// Pressure conversions
export const convertPressure = (value: number, from: PressureUnit, to: PressureUnit): number => {
  if (from === to) return value;
  
  if (from === 'bar' && to === 'psi') {
    return Math.round(value * 14.5038);
  }
  if (from === 'psi' && to === 'bar') {
    return Math.round((value * 0.0689476) * 10) / 10;
  }
  
  return value;
};

export const formatPressure = (value: number, unit: PressureUnit, precision: number = 0): string => {
  // Database stores in bar, so convert if user wants psi
  const convertedValue = unit === 'psi' ? convertPressure(value, 'bar', 'psi') : value;
  const label = unit === 'bar' ? 'bar' : 'psi';
  return `${convertedValue.toFixed(precision)}${label}`;
};

// Volume conversions
export const convertVolume = (value: number, from: VolumeUnit, to: VolumeUnit): number => {
  if (from === to) return value;
  
  if (from === 'liters' && to === 'cubic_feet') {
    return Math.round((value * 0.0353147) * 10) / 10;
  }
  if (from === 'cubic_feet' && to === 'liters') {
    return Math.round((value * 28.3168) * 10) / 10;
  }
  
  return value;
};

export const formatVolume = (value: number, unit: VolumeUnit, precision: number = 1): string => {
  // Database stores in liters, so convert if user wants cubic feet
  const convertedValue = unit === 'cubic_feet' ? convertVolume(value, 'liters', 'cubic_feet') : value;
  const label = unit === 'liters' ? 'L' : 'ft³';
  return `${convertedValue.toFixed(precision)}${label}`;
};

// Helper function to format any value with appropriate units
export const formatValue = (
  value: number,
  type: 'depth' | 'temperature' | 'distance' | 'weight' | 'pressure' | 'volume',
  unit: DepthUnit | TemperatureUnit | DistanceUnit | WeightUnit | PressureUnit | VolumeUnit,
  precision?: number
): string => {
  switch (type) {
    case 'depth':
      return formatDepth(value, unit as DepthUnit, precision);
    case 'temperature':
      return formatTemperature(value, unit as TemperatureUnit, precision);
    case 'distance':
      return formatDistance(value, unit as DistanceUnit, precision);
    case 'weight':
      return formatWeight(value, unit as WeightUnit, precision);
    case 'pressure':
      return formatPressure(value, unit as PressureUnit, precision);
    case 'volume':
      return formatVolume(value, unit as VolumeUnit, precision);
    default:
      return value.toString();
  }
};
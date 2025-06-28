import type { DepthUnit, TemperatureUnit, DistanceUnit, WeightUnit, PressureUnit } from './settings';

// Depth conversions
export const convertDepth = (value: number, from: DepthUnit, to: DepthUnit): number => {
  if (from === to) return value;
  
  if (from === 'meters' && to === 'feet') {
    return value * 3.28084;
  }
  if (from === 'feet' && to === 'meters') {
    return value * 0.3048;
  }
  
  return value;
};

export const formatDepth = (value: number, unit: DepthUnit, precision: number = 1): string => {
  const label = unit === 'meters' ? 'm' : 'ft';
  return `${value.toFixed(precision)}${label}`;
};

// Temperature conversions
export const convertTemperature = (value: number, from: TemperatureUnit, to: TemperatureUnit): number => {
  if (from === to) return value;
  
  if (from === 'celsius' && to === 'fahrenheit') {
    return (value * 9/5) + 32;
  }
  if (from === 'fahrenheit' && to === 'celsius') {
    return (value - 32) * 5/9;
  }
  
  return value;
};

export const formatTemperature = (value: number, unit: TemperatureUnit, precision: number = 1): string => {
  const label = unit === 'celsius' ? '°C' : '°F';
  return `${value.toFixed(precision)}${label}`;
};

// Distance conversions
export const convertDistance = (value: number, from: DistanceUnit, to: DistanceUnit): number => {
  if (from === to) return value;
  
  if (from === 'kilometers' && to === 'miles') {
    return value * 0.621371;
  }
  if (from === 'miles' && to === 'kilometers') {
    return value * 1.60934;
  }
  
  return value;
};

export const formatDistance = (value: number, unit: DistanceUnit, precision: number = 1): string => {
  const label = unit === 'kilometers' ? 'km' : 'mi';
  return `${value.toFixed(precision)}${label}`;
};

// Weight conversions
export const convertWeight = (value: number, from: WeightUnit, to: WeightUnit): number => {
  if (from === to) return value;
  
  if (from === 'kilograms' && to === 'pounds') {
    return value * 2.20462;
  }
  if (from === 'pounds' && to === 'kilograms') {
    return value * 0.453592;
  }
  
  return value;
};

export const formatWeight = (value: number, unit: WeightUnit, precision: number = 1): string => {
  const label = unit === 'kilograms' ? 'kg' : 'lbs';
  return `${value.toFixed(precision)}${label}`;
};

// Pressure conversions
export const convertPressure = (value: number, from: PressureUnit, to: PressureUnit): number => {
  if (from === to) return value;
  
  if (from === 'bar' && to === 'psi') {
    return value * 14.5038;
  }
  if (from === 'psi' && to === 'bar') {
    return value * 0.0689476;
  }
  
  return value;
};

export const formatPressure = (value: number, unit: PressureUnit, precision: number = 0): string => {
  const label = unit === 'bar' ? 'bar' : 'psi';
  return `${value.toFixed(precision)}${label}`;
};

// Helper function to format any value with appropriate units
export const formatValue = (
  value: number,
  type: 'depth' | 'temperature' | 'distance' | 'weight' | 'pressure',
  unit: DepthUnit | TemperatureUnit | DistanceUnit | WeightUnit | PressureUnit,
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
    default:
      return value.toString();
  }
};
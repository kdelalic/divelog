import { describe, expect, it } from 'vitest';
import {
  convertDepth,
  convertDistance,
  convertPressure,
  convertTemperature,
  convertVolume,
  convertWeight,
  formatDepth,
  formatPressure,
  formatTemperature,
  formatValue,
} from './unitConversions';

// Conversions are the one place where a wrong answer still looks plausible:
// 30ft reads as a perfectly reasonable dive depth even when it should be 98ft.
// These lock down known-correct reference values rather than re-deriving the
// formula, which would just repeat any mistake in the implementation.
describe('convertDepth', () => {
  it('converts meters to feet', () => {
    expect(convertDepth(30, 'meters', 'feet')).toBe(98.4);
    expect(convertDepth(1, 'meters', 'feet')).toBe(3.3);
  });

  it('converts feet to meters', () => {
    expect(convertDepth(100, 'feet', 'meters')).toBe(30.5);
  });

  it('returns the value unchanged when units match', () => {
    expect(convertDepth(18.5, 'meters', 'meters')).toBe(18.5);
    expect(convertDepth(18.5, 'feet', 'feet')).toBe(18.5);
  });

  it('handles zero', () => {
    expect(convertDepth(0, 'meters', 'feet')).toBe(0);
  });

  it('round-trips within rounding tolerance', () => {
    const feet = convertDepth(40, 'meters', 'feet');
    expect(convertDepth(feet, 'feet', 'meters')).toBeCloseTo(40, 0);
  });
});

describe('convertTemperature', () => {
  it('converts celsius to fahrenheit at reference points', () => {
    expect(convertTemperature(0, 'celsius', 'fahrenheit')).toBe(32);
    expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBe(212);
    expect(convertTemperature(-40, 'celsius', 'fahrenheit')).toBe(-40);
  });

  it('converts fahrenheit to celsius at reference points', () => {
    expect(convertTemperature(32, 'fahrenheit', 'celsius')).toBe(0);
    expect(convertTemperature(212, 'fahrenheit', 'celsius')).toBe(100);
  });

  it('handles typical water temperatures', () => {
    expect(convertTemperature(18, 'celsius', 'fahrenheit')).toBe(64.4);
  });

  it('preserves sub-zero temperatures rather than clamping', () => {
    expect(convertTemperature(-5, 'celsius', 'fahrenheit')).toBe(23);
  });
});

describe('convertDistance', () => {
  it('converts kilometers to miles', () => {
    expect(convertDistance(10, 'kilometers', 'miles')).toBe(6.2);
  });

  it('converts miles to kilometers', () => {
    expect(convertDistance(10, 'miles', 'kilometers')).toBe(16.1);
  });
});

describe('convertWeight', () => {
  it('converts kilograms to pounds', () => {
    expect(convertWeight(10, 'kilograms', 'pounds')).toBe(22);
  });

  it('converts pounds to kilograms', () => {
    expect(convertWeight(10, 'pounds', 'kilograms')).toBe(4.5);
  });
});

describe('convertPressure', () => {
  // Pressure is the one conversion that rounds to a whole number going up,
  // because a psi reading with a decimal is not something a gauge shows.
  it('converts bar to whole psi', () => {
    expect(convertPressure(200, 'bar', 'psi')).toBe(2901);
    expect(convertPressure(1, 'bar', 'psi')).toBe(15);
  });

  it('converts psi to bar', () => {
    expect(convertPressure(3000, 'psi', 'bar')).toBe(206.8);
  });
});

describe('convertVolume', () => {
  it('converts liters to cubic feet', () => {
    expect(convertVolume(12, 'liters', 'cubic_feet')).toBe(0.4);
  });

  it('converts cubic feet to liters', () => {
    expect(convertVolume(80, 'cubic_feet', 'liters')).toBe(2265.3);
  });
});

// The format* helpers assume the stored value is always metric, so passing an
// imperial unit means "convert, then label" - not "label as-is".
describe('formatting', () => {
  it('converts from the stored metric value before labelling', () => {
    expect(formatDepth(30, 'meters')).toBe('30.0m');
    expect(formatDepth(30, 'feet')).toBe('98.4ft');
  });

  it('respects the precision argument', () => {
    expect(formatDepth(30, 'meters', 0)).toBe('30m');
    expect(formatTemperature(18.456, 'celsius', 2)).toBe('18.46°C');
  });

  it('defaults pressure to whole numbers', () => {
    expect(formatPressure(200, 'bar')).toBe('200bar');
    expect(formatPressure(200, 'psi')).toBe('2901psi');
  });

  it('dispatches to the right formatter by type', () => {
    expect(formatValue(30, 'depth', 'feet')).toBe('98.4ft');
    expect(formatValue(0, 'temperature', 'fahrenheit')).toBe('32.0°F');
    expect(formatValue(10, 'distance', 'miles')).toBe('6.2mi');
    expect(formatValue(10, 'weight', 'pounds')).toBe('22.0lbs');
    expect(formatValue(200, 'pressure', 'psi')).toBe('2901psi');
    expect(formatValue(12, 'volume', 'cubic_feet')).toBe('0.4ft³');
  });
});

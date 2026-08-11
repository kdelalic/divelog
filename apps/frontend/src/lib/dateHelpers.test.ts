import { describe, expect, it } from 'vitest';
import { shiftDiveDateTime } from './dateHelpers';

describe('shiftDiveDateTime', () => {
  it('shifts wall-clock time across date boundaries without a timezone suffix', () => {
    expect(shiftDiveDateTime('2026-08-10T23:45:30', 90)).toBe('2026-08-11T01:15:30');
    expect(shiftDiveDateTime('2026-01-01T00:15:00', -60)).toBe('2025-12-31T23:15:00');
  });

  it('leaves unrecognized values unchanged', () => {
    expect(shiftDiveDateTime('not-a-date', 30)).toBe('not-a-date');
  });
});

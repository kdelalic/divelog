// Helper functions for working with datetime strings
import type { UserSettings } from './settings';

// Dive timestamps represent wall-clock time at the site. Shift their calendar
// fields without applying the browser's timezone or emitting a trailing Z.
export const shiftDiveDateTime = (datetime: string, offsetMinutes: number): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(datetime);
  if (!match) return datetime;
  const [, year, month, day, hour, minute, second = '00'] = match;
  const shifted = new Date(Date.UTC(
    Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute) + offsetMinutes, Number(second),
  ));
  const part = (value: number) => String(value).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${part(shifted.getUTCMonth() + 1)}-${part(shifted.getUTCDate())}` +
    `T${part(shifted.getUTCHours())}:${part(shifted.getUTCMinutes())}:${part(shifted.getUTCSeconds())}`;
};

export const formatDiveDate = (datetime: string, settings?: UserSettings): string => {
  const date = new Date(datetime);
  const dateFormat = settings?.preferences?.dateFormat || 'ISO';
  
  switch (dateFormat) {
    case 'US':
      return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      });
    case 'EU':
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    case 'ISO':
    default:
      return date.toISOString().split('T')[0];
  }
};

export const formatTime = (datetime: string, timeFormat: '12h' | '24h' = '24h'): string => {
  const date = new Date(datetime);
  
  if (timeFormat === '12h') {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else {
    return date.toTimeString().substring(0, 5);
  }
};

export const formatDiveDateTime = (datetime: string, settings?: UserSettings): string => {
  const date = new Date(datetime);
  const dateStr = formatDiveDate(datetime, settings);
  const timeFormat = settings?.preferences?.timeFormat || '24h';
  const timeStr = formatTime(datetime, timeFormat);
  
  // Only show time if it's not midnight
  const is24hMidnight = date.toTimeString().substring(0, 5) === '00:00';
  return !is24hMidnight ? `${dateStr} ${timeStr}` : dateStr;
};

export const formatDiveDateTimeLong = (datetime: string, settings?: UserSettings): string => {
  const date = new Date(datetime);
  const dateFormat = settings?.preferences?.dateFormat || 'ISO';
  
  let dateStr: string;
  switch (dateFormat) {
    case 'US':
      dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
      break;
    case 'EU':
      dateStr = date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        day: 'numeric',
        month: 'long', 
        year: 'numeric' 
      });
      break;
    case 'ISO':
    default:
      dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      break;
  }
  
  const timeFormat = settings?.preferences?.timeFormat || '24h';
  const timeStr = formatTime(datetime, timeFormat);
  
  // Only show time if it's not midnight
  const is24hMidnight = date.toTimeString().substring(0, 5) === '00:00';
  return !is24hMidnight ? `${dateStr} ${timeStr}` : dateStr;
};

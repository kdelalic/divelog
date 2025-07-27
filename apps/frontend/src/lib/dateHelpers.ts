// Helper functions for working with datetime strings
import type { UserSettings } from './settings';

export const formatDiveDate = (datetime: string): string => {
  const date = new Date(datetime);
  return date.toLocaleDateString();
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
  const dateStr = date.toLocaleDateString();
  const timeFormat = settings?.preferences?.timeFormat || '24h';
  const timeStr = formatTime(datetime, timeFormat);
  
  // Only show time if it's not midnight
  const is24hMidnight = date.toTimeString().substring(0, 5) === '00:00';
  return !is24hMidnight ? `${dateStr} ${timeStr}` : dateStr;
};

export const formatDiveDateTimeLong = (datetime: string, settings?: UserSettings): string => {
  const date = new Date(datetime);
  const dateStr = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeFormat = settings?.preferences?.timeFormat || '24h';
  const timeStr = formatTime(datetime, timeFormat);
  
  // Only show time if it's not midnight
  const is24hMidnight = date.toTimeString().substring(0, 5) === '00:00';
  return !is24hMidnight ? `${dateStr} ${timeStr}` : dateStr;
};
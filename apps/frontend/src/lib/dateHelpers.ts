// Helper functions for working with datetime strings
import type { UserSettings } from './settings';

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
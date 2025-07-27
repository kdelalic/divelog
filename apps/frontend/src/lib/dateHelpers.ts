// Helper functions for working with datetime strings

export const formatDiveDate = (datetime: string): string => {
  const date = new Date(datetime);
  return date.toLocaleDateString();
};

export const formatDiveDateTime = (datetime: string): string => {
  const date = new Date(datetime);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toTimeString().substring(0, 5);
  
  // Only show time if it's not midnight
  return timeStr !== '00:00' ? `${dateStr} at ${timeStr}` : dateStr;
};

export const formatDiveDateTimeLong = (datetime: string): string => {
  const date = new Date(datetime);
  const dateStr = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = date.toTimeString().substring(0, 5);
  
  // Only show time if it's not midnight
  return timeStr !== '00:00' ? `${dateStr} at ${timeStr}` : dateStr;
};
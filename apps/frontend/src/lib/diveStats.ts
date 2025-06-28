import type { Dive } from './dives';

export interface DiveStatistics {
  totalDives: number;
  totalBottomTime: number;
  maxDepth: number;
  avgDepth: number;
  uniqueLocations: number;
  lastDiveDate: string | null;
  deepestDive: Dive | null;
  longestDive: Dive | null;
}

export const calculateDiveStatistics = (dives: Dive[]): DiveStatistics => {
  if (dives.length === 0) {
    return {
      totalDives: 0,
      totalBottomTime: 0,
      maxDepth: 0,
      avgDepth: 0,
      uniqueLocations: 0,
      lastDiveDate: null,
      deepestDive: null,
      longestDive: null,
    };
  }

  const totalBottomTime = dives.reduce((sum, dive) => sum + dive.duration, 0);
  const maxDepth = Math.max(...dives.map(dive => dive.depth));
  const avgDepth = dives.reduce((sum, dive) => sum + dive.depth, 0) / dives.length;
  const uniqueLocations = new Set(dives.map(dive => dive.location)).size;
  
  const sortedByDate = [...dives].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastDiveDate = sortedByDate[0]?.date || null;
  
  const deepestDive = dives.reduce((deepest, dive) => 
    dive.depth > deepest.depth ? dive : deepest
  );
  
  const longestDive = dives.reduce((longest, dive) => 
    dive.duration > longest.duration ? dive : longest
  );

  return {
    totalDives: dives.length,
    totalBottomTime,
    maxDepth,
    avgDepth: Math.round(avgDepth * 10) / 10,
    uniqueLocations,
    lastDiveDate,
    deepestDive,
    longestDive,
  };
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const getRecentDives = (dives: Dive[], count: number = 5): Dive[] => {
  return [...dives]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
};

export const getDivesByMonth = (dives: Dive[]): { month: string; count: number }[] => {
  const monthCounts = dives.reduce((acc, dive) => {
    const month = new Date(dive.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
};
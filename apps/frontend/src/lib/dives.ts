export interface DiveSample {
  time: number; // Time in seconds from dive start
  depth: number; // Depth in meters
  temperature?: number; // Temperature in celsius
  pressure?: number; // Tank pressure in bar
}

export interface GasMix {
  oxygen: number; // O2 percentage (21 for air, 32 for EANx32, etc.)
  helium?: number; // He percentage (for trimix)
  nitrogen?: number; // N2 percentage (calculated automatically)
  name?: string; // Custom name (e.g., "EANx32", "Trimix 18/45")
}

export interface Tank {
  id?: number;
  name?: string; // Tank identifier (e.g., "Main Tank", "Deco Tank")
  size: number; // Tank volume in liters
  working_pressure: number; // Working pressure in bar
  start_pressure: number; // Starting pressure in bar
  end_pressure: number; // Ending pressure in bar
  gas_mix: GasMix; // Gas mix used
  material?: 'steel' | 'aluminum'; // Tank material
}

export interface Equipment {
  tanks: Tank[]; // Multiple tanks for technical diving
  bcd?: string; // BCD model/type
  regulator?: string; // Regulator model/type
  wetsuit?: {
    type: 'wetsuit' | 'drysuit' | 'shorty' | 'none';
    thickness?: number; // Thickness in mm
    material?: string; // Neoprene, etc.
  };
  weights?: number; // Weight carried in kg
  fins?: string;
  mask?: string;
  computer?: string; // Dive computer model
  notes?: string; // Additional equipment notes
}

export interface DiveConditions {
  waterTemp?: {
    surface?: number; // Surface temperature in celsius
    bottom?: number; // Bottom temperature in celsius
  };
  airTemp?: number; // Air temperature in celsius
  visibility?: number; // Visibility in meters
  current?: {
    strength: 'none' | 'light' | 'moderate' | 'strong';
    direction?: string; // e.g., "NE", "incoming", "outgoing"
  };
  weather?: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'windy';
  seaState?: number; // Sea state scale 0-9
  surge?: 'none' | 'light' | 'moderate' | 'heavy';
}

export interface Dive {
  id: number;
  datetime: string; // ISO 8601 datetime string
  location: string;
  depth: number;
  duration: number;
  buddy?: string;
  lat: number;
  lng: number;
  samples?: DiveSample[]; // Dive profile sample data
  equipment?: Equipment; // Equipment used on dive
  conditions?: DiveConditions; // Environmental conditions
  diveType?: 'recreational' | 'training' | 'technical' | 'work' | 'research';
  rating?: number; // Dive rating 1-5 stars
  notes?: string; // Dive notes and observations
  safetyStops?: {
    depth: number; // Safety stop depth in meters
    duration: number; // Safety stop duration in minutes
  }[];
}

// Utility functions for equipment calculations
export const calculateNitrogen = (oxygen: number, helium = 0): number => {
  return 100 - oxygen - helium;
};

export const createGasMix = (oxygen: number, helium = 0): GasMix => {
  const nitrogen = calculateNitrogen(oxygen, helium);
  let name = '';
  
  if (helium > 0) {
    name = `Trimix ${oxygen}/${helium}`;
  } else if (oxygen === 21) {
    name = 'Air';
  } else {
    name = `EANx${oxygen}`;
  }
  
  return { oxygen, helium, nitrogen, name };
};

export const calculateSAC = (
  tank: Tank,
  diveTime: number, // in minutes
  avgDepth: number, // in meters
  units: 'metric' | 'imperial' = 'metric'
): number => {
  const pressureUsed = tank.start_pressure - tank.end_pressure; // bar
  const avgPressureATA = (avgDepth / 10) + 1; // Convert depth to ATA
  const volumeUsed = (pressureUsed * tank.size) / avgPressureATA; // Liters at surface
  const sacRate = volumeUsed / diveTime; // Liters per minute
  
  // Convert to imperial if needed (cubic feet per minute)
  return units === 'imperial' ? sacRate * 0.0353147 : sacRate;
};

export const calculateRMV = (sacRate: number, avgDepth: number): number => {
  const avgPressureATA = (avgDepth / 10) + 1;
  return sacRate * avgPressureATA; // Respiratory Minute Volume
};

export const getGasMixColor = (gasMix: GasMix): string => {
  if (gasMix.helium && gasMix.helium > 0) {
    return '#8B5CF6'; // Purple for trimix
  } else if (gasMix.oxygen > 21) {
    return '#10B981'; // Green for nitrox
  } else {
    return '#6B7280'; // Gray for air
  };
};


 
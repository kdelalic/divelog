export interface DiveSample {
  time: number; // Time in seconds from dive start
  depth: number; // Depth in meters
  temperature?: number; // Temperature in celsius
  pressure?: number; // Tank pressure in bar
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
}

 
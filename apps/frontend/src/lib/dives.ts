export interface Dive {
  id: number;
  datetime: string; // ISO 8601 datetime string
  location: string;
  depth: number;
  duration: number;
  buddy?: string;
  lat: number;
  lng: number;
}

 
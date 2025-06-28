export interface Dive {
  id: number;
  date: string;
  location: string;
  depth: number;
  duration: number;
  buddy?: string;
  lat: number;
  lng: number;
}

export const mockDives: Dive[] = [
  {
    id: 1,
    date: "2024-05-20",
    location: "Blue Hole, Belize",
    depth: 40,
    duration: 25,
    buddy: "Jane Doe",
    lat: 17.316,
    lng: -87.535,
  },
  {
    id: 2,
    date: "2024-05-22",
    location: "Thistlegorm, Egypt",
    depth: 30,
    duration: 45,
    buddy: "John Smith",
    lat: 27.646,
    lng: 33.919,
  },
  {
    id: 3,
    date: "2024-06-10",
    location: "Great Barrier Reef, Australia",
    depth: 18,
    duration: 60,
    lat: -18.287,
    lng: 147.699,
  },
  {
    id: 4,
    date: "2024-06-15",
    location: "Galapagos Islands, Ecuador",
    depth: 25,
    duration: 50,
    buddy: "Alex Ray",
    lat: -0.672,
    lng: -90.388,
  },
]; 
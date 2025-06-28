import { create } from 'zustand';
import type { Dive } from '../lib/dives';
import { mockDives } from '../lib/dives';

interface DiveState {
  dives: Dive[];
  addDive: (dive: Omit<Dive, 'id'>) => void;
  editDive: (dive: Dive) => void;
  deleteDive: (id: number) => void;
  importDives: (dives: Dive[]) => void;
}

const useDiveStore = create<DiveState>((set) => ({
  dives: mockDives,
  addDive: (dive) =>
    set((state) => ({
      dives: [...state.dives, { ...dive, id: state.dives.length + 1 }],
    })),
  editDive: (updatedDive) =>
    set((state) => ({
      dives: state.dives.map((dive) =>
        dive.id === updatedDive.id ? updatedDive : dive
      ),
    })),
  deleteDive: (id) =>
    set((state) => ({
      dives: state.dives.filter((dive) => dive.id !== id),
    })),
  importDives: (importedDives) =>
    set((state) => {
      // Find the highest existing ID
      const maxId = state.dives.length > 0 
        ? Math.max(...state.dives.map(dive => dive.id))
        : 0;
      
      // Assign new IDs to imported dives to avoid conflicts
      const divesWithNewIds = importedDives.map((dive, index) => ({
        ...dive,
        id: maxId + index + 1,
      }));
      
      return {
        dives: [...state.dives, ...divesWithNewIds],
      };
    }),
}));

export default useDiveStore; 
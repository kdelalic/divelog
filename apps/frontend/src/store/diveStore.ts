import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dive } from '../lib/dives';
import { divesApi } from '../lib/api';

interface DiveState {
  dives: Dive[];
  isLoading: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  
  // Actions
  addDive: (dive: Omit<Dive, 'id'>) => Promise<void>;
  editDive: (dive: Dive) => Promise<void>;
  deleteDive: (id: number) => Promise<void>;
  importDives: (dives: Dive[]) => Promise<void>;
  loadFromBackend: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  setOfflineMode: (offline: boolean) => void;
}

const useDiveStore = create<DiveState>()(
  persist(
    (set, get) => ({
      dives: [],
      isLoading: false,
      isOnline: true,
      lastSyncedAt: null,
      error: null,

      addDive: async (dive) => {
        set({ isLoading: true, error: null });

        // Add to local state immediately with temporary ID
        const tempId = Date.now();
        const diveWithTempId = { ...dive, id: tempId };
        set((state) => ({ dives: [...state.dives, diveWithTempId] }));

        // Try to sync with backend
        if (get().isOnline) {
          const result = await divesApi.createDive(dive);
          if (result.error) {
            set({ error: result.error, isLoading: false });
            console.warn('Failed to sync dive to backend, keeping local changes');
          } else if (result.data) {
            // Replace temporary dive with backend dive
            set((state) => ({
              dives: state.dives.map(d => d.id === tempId ? result.data! : d),
              lastSyncedAt: new Date().toISOString(),
              isLoading: false,
              error: null
            }));
          }
        } else {
          set({ isLoading: false });
        }
      },

      editDive: async (updatedDive) => {
        set({ isLoading: true, error: null });

        // Update local state immediately
        set((state) => ({
          dives: state.dives.map((dive) =>
            dive.id === updatedDive.id ? updatedDive : dive
          ),
        }));

        // Try to sync with backend
        if (get().isOnline) {
          const result = await divesApi.updateDive(updatedDive);
          if (result.error) {
            set({ error: result.error, isLoading: false });
            console.warn('Failed to sync dive update to backend, keeping local changes');
          } else {
            set({ 
              lastSyncedAt: new Date().toISOString(),
              isLoading: false,
              error: null 
            });
          }
        } else {
          set({ isLoading: false });
        }
      },

      deleteDive: async (id) => {
        set({ isLoading: true, error: null });

        // Remove from local state immediately
        set((state) => ({
          dives: state.dives.filter((dive) => dive.id !== id),
        }));

        // Try to sync with backend
        if (get().isOnline) {
          const result = await divesApi.deleteDive(id);
          if (result.error) {
            set({ error: result.error, isLoading: false });
            console.warn('Failed to sync dive deletion to backend, keeping local changes');
          } else {
            set({ 
              lastSyncedAt: new Date().toISOString(),
              isLoading: false,
              error: null 
            });
          }
        } else {
          set({ isLoading: false });
        }
      },

      importDives: async (importedDives) => {
        set({ isLoading: true, error: null });

        // Add to local state immediately with temporary IDs
        const tempDives = importedDives.map((dive, index) => ({
          ...dive,
          id: Date.now() + index,
        }));
        set((state) => ({ dives: [...state.dives, ...tempDives] }));

        // Try to sync with backend
        if (get().isOnline) {
          const result = await divesApi.createMultipleDives(importedDives);
          if (result.error) {
            set({ error: result.error, isLoading: false });
            console.warn('Failed to sync imported dives to backend, keeping local changes');
          } else if (result.data) {
            // Replace temporary dives with backend dives
            set((state) => {
              const nonTempDives = state.dives.filter(d => !tempDives.some(td => td.id === d.id));
              return {
                dives: [...nonTempDives, ...result.data!],
                lastSyncedAt: new Date().toISOString(),
                isLoading: false,
                error: null
              };
            });
          }
        } else {
          set({ isLoading: false });
        }
      },

      loadFromBackend: async () => {
        set({ isLoading: true, error: null });

        const result = await divesApi.fetchDives();
        if (result.error) {
          set({ error: result.error, isLoading: false, isOnline: false });
          console.warn('Failed to load dives from backend, using local dives');
        } else {
          set({ 
            dives: result.data || [],
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            error: null,
            isOnline: true 
          });
        }
      },

      syncWithBackend: async () => {
        const currentDives = get().dives;
        set({ isLoading: true, error: null });

        // For now, just fetch from backend (full sync implementation would be more complex)
        const result = await divesApi.fetchDives();
        if (result.error) {
          set({ error: result.error, isLoading: false });
        } else {
          set({ 
            dives: result.data || currentDives,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            error: null 
          });
        }
      },

      setOfflineMode: (offline) => {
        set({ isOnline: !offline });
      },
    }),
    {
      name: 'dive-log-dives',
      version: 2, // Increment version for new state structure
      partialize: (state) => ({
        dives: state.dives,
        lastSyncedAt: state.lastSyncedAt,
      }), // Only persist dives and sync time, not loading states
    }
  )
);

export default useDiveStore; 
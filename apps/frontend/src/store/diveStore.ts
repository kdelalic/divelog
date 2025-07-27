import { create } from 'zustand';
import type { Dive } from '../lib/dives';
import { divesApi } from '../lib/api';

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'import';
  data: any;
  timestamp: number;
}

interface DiveState {
  dives: Dive[];
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  offlineQueue: OfflineOperation[];
  
  // Actions
  addDive: (dive: Omit<Dive, 'id'>) => Promise<void>;
  editDive: (dive: Dive) => Promise<void>;
  deleteDive: (id: number) => Promise<void>;
  importDives: (dives: Dive[]) => Promise<void>;
  loadFromBackend: () => Promise<void>;
  processOfflineQueue: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

const useDiveStore = create<DiveState>()((set, get) => ({
  dives: [],
  isLoading: false,
  isOnline: navigator.onLine,
  error: null,
  offlineQueue: [],

  addDive: async (dive) => {
    set({ isLoading: true, error: null });

    if (get().isOnline) {
      const result = await divesApi.createDive(dive);
      if (result.error) {
        // Add to offline queue and update online status
        const operation: OfflineOperation = {
          id: crypto.randomUUID(),
          type: 'create',
          data: dive,
          timestamp: Date.now()
        };
        set((state) => ({ 
          offlineQueue: [...state.offlineQueue, operation],
          isOnline: false,
          error: 'Network error - operation queued for retry',
          isLoading: false
        }));
      } else if (result.data) {
        // Success - reload from backend to get fresh data
        await get().loadFromBackend();
      }
    } else {
      // Add to offline queue
      const operation: OfflineOperation = {
        id: crypto.randomUUID(),
        type: 'create',
        data: dive,
        timestamp: Date.now()
      };
      set((state) => ({ 
        offlineQueue: [...state.offlineQueue, operation],
        isLoading: false
      }));
    }
  },

  editDive: async (updatedDive) => {
    set({ isLoading: true, error: null });

    if (get().isOnline) {
      const result = await divesApi.updateDive(updatedDive);
      if (result.error) {
        const operation: OfflineOperation = {
          id: crypto.randomUUID(),
          type: 'update',
          data: updatedDive,
          timestamp: Date.now()
        };
        set((state) => ({ 
          offlineQueue: [...state.offlineQueue, operation],
          isOnline: false,
          error: 'Network error - operation queued for retry',
          isLoading: false
        }));
      } else {
        await get().loadFromBackend();
      }
    } else {
      const operation: OfflineOperation = {
        id: crypto.randomUUID(),
        type: 'update',
        data: updatedDive,
        timestamp: Date.now()
      };
      set((state) => ({ 
        offlineQueue: [...state.offlineQueue, operation],
        isLoading: false
      }));
    }
  },

  deleteDive: async (id) => {
    set({ isLoading: true, error: null });

    if (get().isOnline) {
      const result = await divesApi.deleteDive(id);
      if (result.error) {
        const operation: OfflineOperation = {
          id: crypto.randomUUID(),
          type: 'delete',
          data: { id },
          timestamp: Date.now()
        };
        set((state) => ({ 
          offlineQueue: [...state.offlineQueue, operation],
          isOnline: false,
          error: 'Network error - operation queued for retry',
          isLoading: false
        }));
      } else {
        await get().loadFromBackend();
      }
    } else {
      const operation: OfflineOperation = {
        id: crypto.randomUUID(),
        type: 'delete',
        data: { id },
        timestamp: Date.now()
      };
      set((state) => ({ 
        offlineQueue: [...state.offlineQueue, operation],
        isLoading: false
      }));
    }
  },

  importDives: async (importedDives) => {
    set({ isLoading: true, error: null });

    if (get().isOnline) {
      const result = await divesApi.createMultipleDives(importedDives);
      if (result.error) {
        const operation: OfflineOperation = {
          id: crypto.randomUUID(),
          type: 'import',
          data: importedDives,
          timestamp: Date.now()
        };
        set((state) => ({ 
          offlineQueue: [...state.offlineQueue, operation],
          isOnline: false,
          error: 'Network error - operation queued for retry',
          isLoading: false
        }));
      } else {
        await get().loadFromBackend();
      }
    } else {
      const operation: OfflineOperation = {
        id: crypto.randomUUID(),
        type: 'import',
        data: importedDives,
        timestamp: Date.now()
      };
      set((state) => ({ 
        offlineQueue: [...state.offlineQueue, operation],
        isLoading: false
      }));
    }
  },

  loadFromBackend: async () => {
    set({ isLoading: true, error: null });

    const result = await divesApi.fetchDives();
    if (result.error) {
      set({ error: result.error, isLoading: false, isOnline: false });
    } else {
      set({ 
        dives: result.data || [],
        isLoading: false,
        error: null,
        isOnline: true 
      });
      // Process any queued operations now that we're back online
      if (get().offlineQueue.length > 0) {
        await get().processOfflineQueue();
      }
    }
  },

  processOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;

    set({ isLoading: true });
    
    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'create':
            await divesApi.createDive(operation.data);
            break;
          case 'update':
            await divesApi.updateDive(operation.data);
            break;
          case 'delete':
            await divesApi.deleteDive(operation.data.id);
            break;
          case 'import':
            await divesApi.createMultipleDives(operation.data);
            break;
        }
        
        // Remove successful operation from queue
        set((state) => ({
          offlineQueue: state.offlineQueue.filter(op => op.id !== operation.id)
        }));
      } catch (error) {
        console.warn('Failed to process offline operation:', operation, error);
        break; // Stop processing on first failure
      }
    }
    
    // Reload data from backend after processing queue
    await get().loadFromBackend();
  },

  setOnlineStatus: (online) => {
    set({ isOnline: online });
    if (online && get().offlineQueue.length > 0) {
      get().processOfflineQueue();
    }
  },
}));

export default useDiveStore; 
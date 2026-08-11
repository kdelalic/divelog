import { create } from 'zustand';
import type { TagSummary, Trip } from '@/lib/dives';
import { organizationApi, type BulkDiveUpdateInput, type TripInput } from '@/lib/api';
import useDiveStore from './diveStore';

interface OrganizationState {
  tags: TagSummary[];
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  createTag: (name: string) => Promise<boolean>;
  updateTag: (id: number, name: string) => Promise<boolean>;
  deleteTag: (id: number) => Promise<boolean>;
  createTrip: (trip: TripInput) => Promise<boolean>;
  updateTrip: (id: number, trip: TripInput) => Promise<boolean>;
  deleteTrip: (id: number) => Promise<boolean>;
  mergeTrips: (targetId: number, sourceIds: number[]) => Promise<boolean>;
  splitTrip: (sourceId: number, diveIds: number[], trip: TripInput) => Promise<boolean>;
  renumberDives: (request: {
    scope: 'all' | 'range'; startNumber: number; increment: number; fromDate?: string; toDate?: string;
  }) => Promise<number | null>;
  bulkUpdateDives: (request: BulkDiveUpdateInput) => Promise<boolean>;
  bulkDeleteDives: (diveIds: number[]) => Promise<boolean>;
}

const useOrganizationStore = create<OrganizationState>()((set, get) => {
  const refresh = async () => {
    await Promise.all([get().load(), useDiveStore.getState().loadFromBackend()]);
  };
  const run = async (operation: () => Promise<{ error?: string }>): Promise<boolean> => {
    set({ isLoading: true, error: null });
    const result = await operation();
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return false;
    }
    await refresh();
    return true;
  };

  return {
    tags: [],
    trips: [],
    isLoading: false,
    error: null,
    load: async () => {
      set({ isLoading: true, error: null });
      const [tags, trips] = await Promise.all([organizationApi.fetchTags(), organizationApi.fetchTrips()]);
      if (tags.error || trips.error) {
        set({ isLoading: false, error: tags.error ?? trips.error ?? 'Could not load logbook organization' });
        return;
      }
      set({ tags: tags.data ?? [], trips: trips.data ?? [], isLoading: false, error: null });
    },
    createTag: (name) => run(() => organizationApi.createTag(name)),
    updateTag: (id, name) => run(() => organizationApi.updateTag(id, name)),
    deleteTag: (id) => run(() => organizationApi.deleteTag(id)),
    createTrip: (trip) => run(() => organizationApi.createTrip(trip)),
    updateTrip: (id, trip) => run(() => organizationApi.updateTrip(id, trip)),
    deleteTrip: (id) => run(() => organizationApi.deleteTrip(id)),
    mergeTrips: (targetId, sourceIds) => run(() => organizationApi.mergeTrips(targetId, sourceIds)),
    splitTrip: (sourceId, diveIds, trip) => run(() => organizationApi.splitTrip(sourceId, diveIds, trip)),
    renumberDives: async (request) => {
      set({ isLoading: true, error: null });
      const result = await organizationApi.renumberDives(request);
      if (result.error) {
        set({ isLoading: false, error: result.error });
        return null;
      }
      await refresh();
      return result.data?.renumbered_count ?? 0;
    },
    bulkUpdateDives: (request) => run(() => organizationApi.bulkUpdateDives(request)),
    bulkDeleteDives: (diveIds) => run(() => organizationApi.bulkDeleteDives(diveIds)),
  };
});

export default useOrganizationStore;

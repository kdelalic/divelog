import type { UserSettings } from './settings';
import type { Dive, TagSummary, Trip } from './dives';

export interface DiveSite {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:8080';
const API_BASE_URL = `${API_ORIGIN}/api/v1`;
const DEFAULT_USER_ID = 1; // Development user ID

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

const readApiError = async (response: Response): Promise<string> => {
  try {
    const body = await response.json() as {
      error?: string;
      message?: string;
      fields?: Record<string, string>;
    };
    const fieldErrors = body.fields
      ? Object.entries(body.fields).map(([field, message]) => `${field}: ${message}`).join('; ')
      : '';
    return [body.message || body.error, fieldErrors].filter(Boolean).join(' — ') || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

// API utility functions for settings
export const settingsApi = {
  // Fetch settings from backend
  async fetchSettings(): Promise<ApiResponse<UserSettings>> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings?user_id=${DEFAULT_USER_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Update settings on backend
  async updateSettings(settings: UserSettings): Promise<ApiResponse<UserSettings>> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings?user_id=${DEFAULT_USER_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Check if backend is available
  async healthCheck(): Promise<boolean> {
    try {
			const response = await fetch(`${API_ORIGIN}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  },
};

// The API uses snake_case field names, while the client models are camelCase.
// Sending a Dive verbatim silently drops conditions, dive type and safety stops,
// since Go ignores unknown JSON keys.
export const serializeDive = (dive: Omit<Dive, 'id'>) => {
  const { conditions, diveType, safetyStops, diveNumber, trip, ...rest } = dive;

  return {
    ...rest,
    dive_type: diveType,
		dive_number: diveNumber,
		trip_id: trip && trip.id > 0 ? trip.id : undefined,
		trip: trip && trip.id > 0 ? undefined : trip && {
			name: trip.name,
			location: trip.location,
			start_date: trip.startDate,
			end_date: trip.endDate,
			notes: trip.notes,
		},
    safety_stops: safetyStops,
    water_temperature: conditions?.waterTemp?.bottom ?? conditions?.waterTemp?.surface,
    // The API models visibility as a whole number of meters
    visibility: conditions?.visibility !== undefined ? Math.round(conditions.visibility) : undefined,
    conditions: conditions && {
      water_temp_surface: conditions.waterTemp?.surface,
      water_temp_bottom: conditions.waterTemp?.bottom,
      air_temp: conditions.airTemp,
      visibility: conditions.visibility,
      current_strength: conditions.current?.strength,
      current_direction: conditions.current?.direction,
      weather: conditions.weather,
      sea_state: conditions.seaState,
      surge: conditions.surge,
    },
  };
};

// Leave headroom below the backend's 10 MB request limit for headers and any
// small wire-shape changes. Profile-heavy backups can otherwise exceed the
// limit even when the backup file itself is valid.
export const MAX_DIVE_BATCH_BYTES = 8 * 1024 * 1024;

export const chunkDivesForUpload = (
  dives: Omit<Dive, 'id'>[],
  maximumBytes = MAX_DIVE_BATCH_BYTES,
): Omit<Dive, 'id'>[][] => {
  const encoder = new TextEncoder();
  const batches: Omit<Dive, 'id'>[][] = [];
  let batch: Omit<Dive, 'id'>[] = [];
  let batchBytes = 2; // Opening and closing JSON array brackets.

  for (const dive of dives) {
    const diveBytes = encoder.encode(JSON.stringify(serializeDive(dive))).byteLength;
    if (diveBytes + 2 > maximumBytes) {
      throw new Error('A single dive profile is too large for the backend request limit');
    }

    const separatorBytes = batch.length > 0 ? 1 : 0;
    if (batch.length > 0 && batchBytes + separatorBytes + diveBytes > maximumBytes) {
      batches.push(batch);
      batch = [];
      batchBytes = 2;
    }

    batch.push(dive);
    batchBytes += (batch.length > 1 ? 1 : 0) + diveBytes;
  }

  if (batch.length > 0) batches.push(batch);
  return batches;
};

interface ApiDiveConditions {
  water_temp_surface?: number;
  water_temp_bottom?: number;
  air_temp?: number;
  visibility?: number;
  current_strength?: 'none' | 'light' | 'moderate' | 'strong';
  current_direction?: string;
  weather?: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'windy';
  sea_state?: number;
  surge?: 'none' | 'light' | 'moderate' | 'heavy';
}

type ApiDive = Omit<Dive, 'conditions' | 'diveType' | 'safetyStops' | 'diveNumber' | 'trip'> & {
  conditions?: ApiDiveConditions;
  dive_type?: Dive['diveType'];
  safety_stops?: Dive['safetyStops'];
	dive_number?: number;
	trip_id?: number;
	trip?: {
		id: number;
		name: string;
		location?: string;
		start_date?: string;
		end_date?: string;
		notes?: string;
		dive_count?: number;
	};
};

// Normalize the Go API's snake_case response fields into the client model.
// Without this read-side mapping, enhanced data appears to save successfully
// and then vanishes from the UI on the next backend reload.
export const deserializeDive = (apiDive: ApiDive): Dive => {
  const { conditions, dive_type, safety_stops, dive_number, trip_id: _tripId, trip, ...rest } = apiDive;
	void _tripId;
  const waterTemp = conditions?.water_temp_surface !== undefined || conditions?.water_temp_bottom !== undefined
    ? {
        surface: conditions.water_temp_surface,
        bottom: conditions.water_temp_bottom,
      }
    : undefined;
  const current = conditions?.current_strength
    ? {
        strength: conditions.current_strength,
        direction: conditions.current_direction,
      }
    : undefined;

  return {
    ...rest,
    diveType: dive_type,
		diveNumber: dive_number,
		trip: trip && {
			id: trip.id,
			name: trip.name,
			location: trip.location,
			startDate: trip.start_date,
			endDate: trip.end_date,
			notes: trip.notes,
			diveCount: trip.dive_count,
		},
    safetyStops: safety_stops,
    conditions: conditions
      ? {
          waterTemp,
          airTemp: conditions.air_temp,
          visibility: conditions.visibility,
          current,
          weather: conditions.weather,
          seaState: conditions.sea_state,
          surge: conditions.surge,
        }
      : undefined,
  };
};

type ApiTrip = {
  id: number;
  name: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  dive_count?: number;
};

const deserializeTrip = (trip: ApiTrip): Trip => ({
  id: trip.id,
  name: trip.name,
  location: trip.location,
  startDate: trip.start_date,
  endDate: trip.end_date,
  notes: trip.notes,
  diveCount: trip.dive_count,
});

// API utility functions for dives
export const divesApi = {
  // Fetch all dives from backend
  async fetchDives(): Promise<ApiResponse<Dive[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dives?user_id=${DEFAULT_USER_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json() as ApiDive[];
      return { data: data.map(deserializeDive) };
    } catch (error) {
      console.error('Failed to fetch dives:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Create a single dive
  async createDive(dive: Omit<Dive, 'id'>): Promise<ApiResponse<Dive>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dives?user_id=${DEFAULT_USER_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializeDive(dive)),
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json() as ApiDive;
      return { data: deserializeDive(data) };
    } catch (error) {
      console.error('Failed to create dive:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Create multiple dives (for imports)
  async createMultipleDives(dives: Omit<Dive, 'id'>[]): Promise<ApiResponse<Dive[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dives/batch?user_id=${DEFAULT_USER_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dives.map(serializeDive)),
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json() as { created?: ApiDive[] };
      return { data: (data.created ?? []).map(deserializeDive) };
    } catch (error) {
      console.error('Failed to create multiple dives:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Update a dive
  async updateDive(dive: Dive): Promise<ApiResponse<Dive>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dives/${dive.id}?user_id=${DEFAULT_USER_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializeDive(dive)),
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json() as ApiDive;
      return { data: deserializeDive(data) };
    } catch (error) {
      console.error('Failed to update dive:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Delete a dive
  async deleteDive(diveId: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dives/${diveId}?user_id=${DEFAULT_USER_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { data: undefined };
    } catch (error) {
      console.error('Failed to delete dive:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Delete every dive for the user. Development only - the backend does not
  // register this route in release mode.
  async deleteAllDives(): Promise<ApiResponse<{ deleted_count: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dives?user_id=${DEFAULT_USER_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to delete all dives:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};

export type TripInput = Omit<Trip, 'id' | 'diveCount'>;

export interface BulkDiveUpdateInput {
  diveIds: number[];
  tripId?: number;
  clearTrip?: boolean;
  addTags?: string[];
  removeTags?: string[];
  buddy?: string;
  clearBuddy?: boolean;
  diveType?: Dive['diveType'];
  clearDiveType?: boolean;
  rating?: number;
  clearRating?: boolean;
}

const organizationRequest = async <T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> => {
  try {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${API_BASE_URL}${path}${separator}user_id=${DEFAULT_USER_ID}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!response.ok) return { error: await readApiError(response), status: response.status };
    if (response.status === 204) return { data: undefined as T };
    return { data: await response.json() as T };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const serializeTrip = (trip: TripInput) => ({
  name: trip.name,
  location: trip.location,
  start_date: trip.startDate,
  end_date: trip.endDate,
  notes: trip.notes,
});

export const organizationApi = {
  async fetchTags(): Promise<ApiResponse<TagSummary[]>> {
    const response = await organizationRequest<Array<{ id: number; name: string; dive_count: number }>>('/tags');
		return response.data
			? { data: response.data.map((tag) => ({ id: tag.id, name: tag.name, diveCount: tag.dive_count })) }
			: { error: response.error, status: response.status };
  },
  createTag(name: string): Promise<ApiResponse<TagSummary>> {
    return organizationRequest('/tags', { method: 'POST', body: JSON.stringify({ name }) });
  },
  updateTag(id: number, name: string): Promise<ApiResponse<TagSummary>> {
    return organizationRequest(`/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
  },
  deleteTag(id: number): Promise<ApiResponse<void>> {
    return organizationRequest(`/tags/${id}`, { method: 'DELETE' });
  },
  async fetchTrips(): Promise<ApiResponse<Trip[]>> {
    const response = await organizationRequest<ApiTrip[]>('/trips');
    return response.data ? { data: response.data.map(deserializeTrip) } : response;
  },
  bulkUpdateDives(input: BulkDiveUpdateInput): Promise<ApiResponse<{ updated_count: number }>> {
    return organizationRequest('/dives/bulk', {
      method: 'PATCH',
      body: JSON.stringify({
        dive_ids: input.diveIds,
        trip_id: input.tripId,
        clear_trip: input.clearTrip,
        add_tags: input.addTags,
        remove_tags: input.removeTags,
        buddy: input.buddy,
        clear_buddy: input.clearBuddy,
        dive_type: input.diveType,
        clear_dive_type: input.clearDiveType,
        rating: input.rating,
        clear_rating: input.clearRating,
      }),
    });
  },
  bulkDeleteDives(diveIds: number[]): Promise<ApiResponse<{ deleted_count: number }>> {
    return organizationRequest('/dives/bulk-delete', {
      method: 'POST', body: JSON.stringify({ dive_ids: diveIds }),
    });
  },
  async createTrip(trip: TripInput): Promise<ApiResponse<Trip>> {
    const response = await organizationRequest<ApiTrip>('/trips', { method: 'POST', body: JSON.stringify(serializeTrip(trip)) });
    return response.data ? { data: deserializeTrip(response.data) } : response;
  },
  async updateTrip(id: number, trip: TripInput): Promise<ApiResponse<Trip>> {
    const response = await organizationRequest<ApiTrip>(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(serializeTrip(trip)) });
    return response.data ? { data: deserializeTrip(response.data) } : response;
  },
  deleteTrip(id: number): Promise<ApiResponse<void>> {
    return organizationRequest(`/trips/${id}`, { method: 'DELETE' });
  },
  mergeTrips(targetId: number, sourceTripIds: number[]): Promise<ApiResponse<{ message: string }>> {
    return organizationRequest(`/trips/${targetId}/merge`, {
      method: 'POST', body: JSON.stringify({ source_trip_ids: sourceTripIds }),
    });
  },
  async splitTrip(sourceId: number, diveIds: number[], trip: TripInput): Promise<ApiResponse<Trip>> {
    const response = await organizationRequest<ApiTrip>(`/trips/${sourceId}/split`, {
      method: 'POST', body: JSON.stringify({ dive_ids: diveIds, trip: serializeTrip(trip) }),
    });
    return response.data ? { data: deserializeTrip(response.data) } : response;
  },
  renumberDives(request: {
    scope: 'all' | 'range'; startNumber: number; increment: number; fromDate?: string; toDate?: string;
  }): Promise<ApiResponse<{ renumbered_count: number }>> {
    return organizationRequest('/dives/renumber', {
      method: 'POST',
      body: JSON.stringify({
        scope: request.scope,
        start_number: request.startNumber,
        increment: request.increment,
        from_date: request.fromDate,
        to_date: request.toDate,
      }),
    });
  },
};

// API utility functions for dive sites
export const diveSitesApi = {
  // Fetch all dive sites
  async fetchDiveSites(): Promise<ApiResponse<DiveSite[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dive-sites`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to fetch dive sites:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Search dive sites by name
  async searchDiveSites(query: string): Promise<ApiResponse<DiveSite[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dive-sites/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to search dive sites:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get a specific dive site
  async getDiveSite(id: number): Promise<ApiResponse<DiveSite>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dive-sites/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to get dive site:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Create a new dive site
  async createDiveSite(site: Omit<DiveSite, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<DiveSite>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dive-sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(site),
      });

      if (!response.ok) {
        return { error: await readApiError(response), status: response.status };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to create dive site:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Update a dive site
  async updateDiveSite(site: DiveSite): Promise<ApiResponse<DiveSite>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dive-sites/${site.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: site.name,
          latitude: site.latitude,
          longitude: site.longitude,
          description: site.description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to update dive site:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Delete a dive site
  async deleteDiveSite(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dive-sites/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { data: undefined };
    } catch (error) {
      console.error('Failed to delete dive site:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};

// Generic API error handler
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

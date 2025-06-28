import type { UserSettings } from './settings';
import type { Dive } from './dives';

const API_BASE_URL = 'http://localhost:8080/api/v1';
const DEFAULT_USER_ID = 1; // Development user ID

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

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
        throw new Error(`HTTP error! status: ${response.status}`);
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
      const response = await fetch(`http://localhost:8080/health`, {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
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
        body: JSON.stringify(dive),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
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
        body: JSON.stringify(dives),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
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
        body: JSON.stringify(dive),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
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
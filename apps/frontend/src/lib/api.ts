import type { UserSettings } from './settings';
import type { Dive } from './dives';

export interface DiveSite {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_BASE_URL = `${SERVER_URL}/api/v1`;

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

// The access token lives in memory only (never localStorage) and is
// managed by the auth store via setAccessToken.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// The auth store registers a refresh handler so apiFetch can transparently
// renew an expired access token and retry once on 401.
let refreshHandler: (() => Promise<string | null>) | null = null;

export const setRefreshHandler = (handler: () => Promise<string | null>) => {
  refreshHandler = handler;
};

// apiFetch wraps fetch with auth headers, JSON handling, and a single
// refresh-and-retry on 401.
async function apiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401 && !retried && refreshHandler) {
      const newToken = await refreshHandler();
      if (newToken) {
        return apiFetch<T>(path, options, true);
      }
    }

    if (!response.ok) {
      let message = `HTTP error! status: ${response.status}`;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {
        // Non-JSON error body; keep the generic message
      }
      return { error: message, status: response.status };
    }

    if (response.status === 204) {
      return { data: undefined, status: response.status };
    }

    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    console.error(`API request failed: ${path}`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// API utility functions for authentication.
// Auth requests use credentials: 'include' so the httpOnly refresh
// token cookie is sent and stored by the browser.
export const authApi = {
  async register(email: string, username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, username, password }),
    });
  },

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
  },

  // Refresh deliberately bypasses apiFetch's retry logic to avoid loops
  async refresh(): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        return { error: 'Session expired', status: response.status };
      }
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    return apiFetch<void>('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },
};

// API utility functions for settings
export const settingsApi = {
  async fetchSettings(): Promise<ApiResponse<UserSettings>> {
    return apiFetch<UserSettings>('/settings', { method: 'GET' });
  },

  async updateSettings(settings: UserSettings): Promise<ApiResponse<UserSettings>> {
    return apiFetch<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Check if backend is available
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${SERVER_URL}/health`, {
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
  async fetchDives(): Promise<ApiResponse<Dive[]>> {
    return apiFetch<Dive[]>('/dives', { method: 'GET' });
  },

  async createDive(dive: Omit<Dive, 'id'>): Promise<ApiResponse<Dive>> {
    return apiFetch<Dive>('/dives', {
      method: 'POST',
      body: JSON.stringify(dive),
    });
  },

  // Create multiple dives (for imports)
  async createMultipleDives(dives: Omit<Dive, 'id'>[]): Promise<ApiResponse<Dive[]>> {
    return apiFetch<Dive[]>('/dives/batch', {
      method: 'POST',
      body: JSON.stringify(dives),
    });
  },

  async updateDive(dive: Dive): Promise<ApiResponse<Dive>> {
    return apiFetch<Dive>(`/dives/${dive.id}`, {
      method: 'PUT',
      body: JSON.stringify(dive),
    });
  },

  async deleteDive(diveId: number): Promise<ApiResponse<void>> {
    return apiFetch<void>(`/dives/${diveId}`, { method: 'DELETE' });
  },
};

// API utility functions for dive sites
export const diveSitesApi = {
  async fetchDiveSites(): Promise<ApiResponse<DiveSite[]>> {
    return apiFetch<DiveSite[]>('/dive-sites', { method: 'GET' });
  },

  async searchDiveSites(query: string): Promise<ApiResponse<DiveSite[]>> {
    return apiFetch<DiveSite[]>(`/dive-sites/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
  },

  async getDiveSite(id: number): Promise<ApiResponse<DiveSite>> {
    return apiFetch<DiveSite>(`/dive-sites/${id}`, { method: 'GET' });
  },

  async createDiveSite(site: Omit<DiveSite, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<DiveSite>> {
    return apiFetch<DiveSite>('/dive-sites', {
      method: 'POST',
      body: JSON.stringify(site),
    });
  },

  async updateDiveSite(site: DiveSite): Promise<ApiResponse<DiveSite>> {
    return apiFetch<DiveSite>(`/dive-sites/${site.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        description: site.description,
      }),
    });
  },

  async deleteDiveSite(id: number): Promise<ApiResponse<void>> {
    return apiFetch<void>(`/dive-sites/${id}`, { method: 'DELETE' });
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

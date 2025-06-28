import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '../lib/settings';
import { defaultSettings } from '../lib/settings';
import { settingsApi } from '../lib/api';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  
  // Actions
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  updateUnitSettings: (units: Partial<UserSettings['units']>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserSettings['preferences']>) => Promise<void>;
  updateDiveSettings: (dive: Partial<UserSettings['dive']>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  setOfflineMode: (offline: boolean) => void;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      isOnline: true,
      lastSyncedAt: null,
      error: null,

      updateSettings: async (newSettings) => {
        const currentSettings = get().settings;
        const updatedSettings = {
          ...currentSettings,
          ...newSettings,
          units: { ...currentSettings.units, ...newSettings.units },
          preferences: { ...currentSettings.preferences, ...newSettings.preferences },
          dive: { ...currentSettings.dive, ...newSettings.dive },
        };

        // Update local state immediately
        set({ settings: updatedSettings, isLoading: true, error: null });

        // Try to sync with backend
        if (get().isOnline) {
          const result = await settingsApi.updateSettings(updatedSettings);
          if (result.error) {
            set({ error: result.error, isLoading: false });
            console.warn('Failed to sync settings to backend, keeping local changes');
          } else {
            set({ 
              settings: result.data || updatedSettings,
              lastSyncedAt: new Date().toISOString(),
              isLoading: false,
              error: null 
            });
          }
        } else {
          set({ isLoading: false });
        }
      },

      updateUnitSettings: async (units) => {
        await get().updateSettings({ units });
      },

      updatePreferences: async (preferences) => {
        await get().updateSettings({ preferences });
      },

      updateDiveSettings: async (dive) => {
        await get().updateSettings({ dive });
      },

      resetToDefaults: async () => {
        set({ isLoading: true, error: null });
        
        if (get().isOnline) {
          const result = await settingsApi.updateSettings(defaultSettings);
          if (result.error) {
            set({ error: result.error, isLoading: false });
          } else {
            set({ 
              settings: result.data || defaultSettings,
              lastSyncedAt: new Date().toISOString(),
              isLoading: false,
              error: null 
            });
          }
        } else {
          set({ settings: defaultSettings, isLoading: false });
        }
      },

      syncWithBackend: async () => {
        const currentSettings = get().settings;
        set({ isLoading: true, error: null });

        const result = await settingsApi.updateSettings(currentSettings);
        if (result.error) {
          set({ error: result.error, isLoading: false });
        } else {
          set({ 
            settings: result.data || currentSettings,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            error: null 
          });
        }
      },

      loadFromBackend: async () => {
        set({ isLoading: true, error: null });

        const result = await settingsApi.fetchSettings();
        if (result.error) {
          set({ error: result.error, isLoading: false, isOnline: false });
          console.warn('Failed to load settings from backend, using local settings');
        } else {
          set({ 
            settings: result.data || defaultSettings,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            error: null,
            isOnline: true 
          });
        }
      },

      setOfflineMode: (offline) => {
        set({ isOnline: !offline });
      },
    }),
    {
      name: 'dive-log-settings',
      version: 2, // Increment version for new state structure
      partialize: (state) => ({
        settings: state.settings,
        lastSyncedAt: state.lastSyncedAt,
      }), // Only persist settings and sync time, not loading states
    }
  )
);

export default useSettingsStore;
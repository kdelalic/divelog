import { create } from 'zustand';
import type { UserSettings, UnitPreference } from '../lib/settings';
import { defaultSettings, unitPresets } from '../lib/settings';
import { settingsApi } from '../lib/api';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  isOnline: boolean;
  error: string | null;
  
  // Actions
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  updateUnitPreference: (preference: UnitPreference) => Promise<void>;
  updateUnitSettings: (units: Partial<UserSettings['units']>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserSettings['preferences']>) => Promise<void>;
  updateDiveSettings: (dive: Partial<UserSettings['dive']>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  isOnline: navigator.onLine,
  error: null,

  updateSettings: async (newSettings) => {
    const currentSettings = get().settings;
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      units: { ...currentSettings.units, ...(newSettings.units || {}) },
      preferences: { ...currentSettings.preferences, ...(newSettings.preferences || {}) },
      dive: { ...currentSettings.dive, ...(newSettings.dive || {}) },
    };

    set({ isLoading: true, error: null });

    if (get().isOnline) {
      const result = await settingsApi.updateSettings(updatedSettings);
      if (result.error) {
        set({ error: result.error, isOnline: false, isLoading: false });
      } else {
        set({ 
          settings: result.data || updatedSettings,
          isLoading: false,
          error: null 
        });
      }
    } else {
      set({ error: 'Offline - settings changes not saved', isLoading: false });
    }
  },

  updateUnitPreference: async (preference) => {
    const currentSettings = get().settings;
    let newUnits = currentSettings.units;
    
    // Apply preset if imperial or metric, keep current units if customize
    if (preference === 'imperial') {
      newUnits = unitPresets.imperial;
    } else if (preference === 'metric') {
      newUnits = unitPresets.metric;
    }
    
    await get().updateSettings({ 
      unitPreference: preference,
      units: newUnits
    });
  },

  updateUnitSettings: async (units) => {
    const currentSettings = get().settings;
    await get().updateSettings({ 
      unitPreference: 'customize',
      units: { ...currentSettings.units, ...units }
    });
  },

  updatePreferences: async (preferences) => {
    const currentSettings = get().settings;
    await get().updateSettings({ 
      preferences: { ...currentSettings.preferences, ...preferences }
    });
  },

  updateDiveSettings: async (dive) => {
    const currentSettings = get().settings;
    await get().updateSettings({ 
      dive: { ...currentSettings.dive, ...dive }
    });
  },

  resetToDefaults: async () => {
    set({ isLoading: true, error: null });
    
    if (get().isOnline) {
      const result = await settingsApi.updateSettings(defaultSettings);
      if (result.error) {
        set({ error: result.error, isOnline: false, isLoading: false });
      } else {
        set({ 
          settings: result.data || defaultSettings,
          isLoading: false,
          error: null 
        });
      }
    } else {
      set({ error: 'Offline - cannot reset to defaults', isLoading: false });
    }
  },

  loadFromBackend: async () => {
    set({ isLoading: true, error: null });

    const result = await settingsApi.fetchSettings();
    if (result.error) {
      set({ error: result.error, isLoading: false, isOnline: false });
    } else {
      set({ 
        settings: result.data || defaultSettings,
        isLoading: false,
        error: null,
        isOnline: true 
      });
    }
  },

  setOnlineStatus: (online) => {
    set({ isOnline: online });
  },
}));

export default useSettingsStore;
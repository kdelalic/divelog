import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '../lib/settings';
import { defaultSettings } from '../lib/settings';

interface SettingsState {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateUnitSettings: (units: Partial<UserSettings['units']>) => void;
  updatePreferences: (preferences: Partial<UserSettings['preferences']>) => void;
  updateDiveSettings: (dive: Partial<UserSettings['dive']>) => void;
  resetToDefaults: () => void;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
            units: { ...state.settings.units, ...newSettings.units },
            preferences: { ...state.settings.preferences, ...newSettings.preferences },
            dive: { ...state.settings.dive, ...newSettings.dive },
          },
        })),

      updateUnitSettings: (units) =>
        set((state) => ({
          settings: {
            ...state.settings,
            units: { ...state.settings.units, ...units },
          },
        })),

      updatePreferences: (preferences) =>
        set((state) => ({
          settings: {
            ...state.settings,
            preferences: { ...state.settings.preferences, ...preferences },
          },
        })),

      updateDiveSettings: (dive) =>
        set((state) => ({
          settings: {
            ...state.settings,
            dive: { ...state.settings.dive, ...dive },
          },
        })),

      resetToDefaults: () =>
        set(() => ({
          settings: defaultSettings,
        })),
    }),
    {
      name: 'dive-log-settings', // unique name for localStorage
      version: 1,
    }
  )
);

export default useSettingsStore;
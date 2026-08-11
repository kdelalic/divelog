export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export const THEME_STORAGE_KEY = 'divelog-theme';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

export const resolveTheme = (
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme => preference === 'system'
  ? (systemPrefersDark ? 'dark' : 'light')
  : preference;

export const readThemePreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

export const applyThemePreference = (preference: ThemePreference): ResolvedTheme => {
  const resolved = resolveTheme(
    preference,
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  return resolved;
};

export const persistThemePreference = (preference: ThemePreference): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme selection still applies for the current session when storage is unavailable.
  }
};

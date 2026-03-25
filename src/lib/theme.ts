export const THEME_COOKIE_NAME = 'matjary-theme'
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return isThemePreference(value) ? value : 'system'
}


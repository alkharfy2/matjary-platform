'use client'

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme'

type ThemeContextValue = {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  mounted: boolean
  setPreference: (nextPreference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference
}

function persistThemePreference(preference: ThemePreference) {
  document.cookie = `${THEME_COOKIE_NAME}=${preference}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`
}

function applyThemeToDom(preference: ThemePreference, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement

  root.dataset.themePreference = preference
  root.style.colorScheme = resolvedTheme

  if (preference === 'system') {
    root.removeAttribute('data-theme')
    return
  }

  root.dataset.theme = preference
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference
  children: ReactNode
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    initialPreference === 'dark' ? 'dark' : 'light'
  )
  const [mounted, setMounted] = useState(false)

  const resolvedTheme = useMemo(
    () => resolveTheme(preference, systemTheme),
    [preference, systemTheme]
  )

  useEffect(() => {
    setMounted(true)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaQueryChange = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    handleMediaQueryChange()

    mediaQuery.addEventListener('change', handleMediaQueryChange)
    return () => mediaQuery.removeEventListener('change', handleMediaQueryChange)
  }, [])

  useEffect(() => {
    applyThemeToDom(preference, resolvedTheme)
    persistThemePreference(preference)
  }, [preference, resolvedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      mounted,
      setPreference(nextPreference) {
        startTransition(() => {
          setPreferenceState(nextPreference)
        })
      },
    }),
    [mounted, preference, resolvedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

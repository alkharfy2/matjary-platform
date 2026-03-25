import type { CSSProperties } from 'react'

export type ThemeColorInputs = {
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

type Rgb = { r: number; g: number; b: number }

type PairIssue = {
  type: 'contrast' | 'distance'
  key: string
  message: string
}

type SurfacePalette = {
  surfaceBase: string
  surfaceMuted: string
  surfaceElevated: string
  surfaceHero: string
  surfaceCard: string
  surfaceCardHover: string
  headerBg: string
  headerLink: string
  headerBrand: string
  borderSoft: string
  borderStrong: string
  accentSoft: string
  heroOverlay: string
  headerShadow: string
  buttonGlow: string
}

const FALLBACK = {
  primary: '#111827',
  secondary: '#ffffff',
  accent: '#2563eb',
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input) return null
  const value = input.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(value)) return value
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }
  return null
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

function srgbToLinear(value: number) {
  const x = value / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const light = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (light + 0.05) / (dark + 0.05)
}

export function pickReadableTextColor(bg: string, dark = '#111827', light = '#ffffff') {
  return contrastRatio(bg, dark) >= contrastRatio(bg, light) ? dark : light
}

export function colorDistance(a: string, b: string): number {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return 0
  const dr = ra.r - rb.r
  const dg = ra.g - rb.g
  const db = ra.b - rb.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

export function mixHexColors(a: string, b: string, weight = 0.5): string {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return a
  const w = clamp(weight, 0, 1)
  return rgbToHex({
    r: ra.r * (1 - w) + rb.r * w,
    g: ra.g * (1 - w) + rb.g * w,
    b: ra.b * (1 - w) + rb.b * w,
  })
}

function ensureDistinctColor(candidate: string, against: string[], fallback: string) {
  let next = candidate
  let mutated = false

  for (const target of against) {
    if (colorDistance(next, target) < 46) {
      next = fallback
      mutated = true
      break
    }
  }

  return { color: next, mutated }
}

export function auditThemeColors(input: ThemeColorInputs) {
  const primary = normalizeHexColor(input.primaryColor)
  const secondary = normalizeHexColor(input.secondaryColor)
  const accent = normalizeHexColor(input.accentColor)

  const issues: PairIssue[] = []
  const normalized = {
    primaryColor: primary ?? FALLBACK.primary,
    secondaryColor: secondary ?? FALLBACK.secondary,
    accentColor: accent ?? FALLBACK.accent,
  }

  if (!primary) {
    issues.push({
      type: 'contrast',
      key: 'primary-invalid',
      message: 'اللون الرئيسي غير صالح (استخدم صيغة #RRGGBB).',
    })
  }
  if (!secondary) {
    issues.push({
      type: 'contrast',
      key: 'secondary-invalid',
      message: 'اللون الثانوي غير صالح (استخدم صيغة #RRGGBB).',
    })
  }
  if (!accent) {
    issues.push({
      type: 'contrast',
      key: 'accent-invalid',
      message: 'لون التمييز غير صالح (استخدم صيغة #RRGGBB).',
    })
  }

  const p = normalized.primaryColor
  const s = normalized.secondaryColor
  const a = normalized.accentColor

  const pairs: Array<[string, string, string]> = [
    ['primary-secondary', p, s],
    ['accent-secondary', a, s],
    ['primary-accent', p, a],
  ]

  for (const [key, c1, c2] of pairs) {
    if (colorDistance(c1, c2) < 46) {
      issues.push({
        type: 'distance',
        key,
        message: 'يوجد تقارب كبير بين الألوان المختارة وقد يسبب ذوبان العناصر.',
      })
    }
  }

  if (contrastRatio(p, s) < 3) {
    issues.push({
      type: 'contrast',
      key: 'primary-vs-secondary',
      message: 'تباين اللون الرئيسي مع الثانوي ضعيف.',
    })
  }
  if (contrastRatio(a, s) < 2.5) {
    issues.push({
      type: 'contrast',
      key: 'accent-vs-secondary',
      message: 'تباين لون التمييز مع اللون الثانوي ضعيف.',
    })
  }

  return {
    normalized,
    issues,
    hasInvalidHex: !primary || !secondary || !accent,
  }
}

export function sanitizeThemeColorsForUi(input: ThemeColorInputs) {
  const audit = auditThemeColors(input)
  let primaryColor = audit.normalized.primaryColor
  let secondaryColor = audit.normalized.secondaryColor
  let accentColor = audit.normalized.accentColor

  const notes: string[] = []

  const secondaryDistinct = ensureDistinctColor(
    secondaryColor,
    [primaryColor, accentColor],
    FALLBACK.secondary
  )
  if (secondaryDistinct.mutated) {
    secondaryColor = secondaryDistinct.color
    notes.push('تم ضبط اللون الثانوي تلقائيًا لتقليل تشابه الألوان.')
  }

  const primaryDistinct = ensureDistinctColor(
    primaryColor,
    [secondaryColor, accentColor],
    FALLBACK.primary
  )
  if (primaryDistinct.mutated) {
    primaryColor = primaryDistinct.color
    notes.push('تم ضبط اللون الرئيسي تلقائيًا لتحسين التباين.')
  }

  const accentDistinct = ensureDistinctColor(
    accentColor,
    [secondaryColor, primaryColor],
    FALLBACK.accent
  )
  if (accentDistinct.mutated) {
    accentColor = accentDistinct.color
    notes.push('تم ضبط لون التمييز تلقائيًا لتوضيح العناصر التفاعلية.')
  }

  return {
    theme: {
      primaryColor,
      secondaryColor,
      accentColor,
    },
    notes,
    audit: auditThemeColors({ primaryColor, secondaryColor, accentColor }),
  }
}

function buildLightPalette(primary: string, secondary: string, accent: string): SurfacePalette {
  const secondaryText = pickReadableTextColor(secondary)
  const surfaceBase = '#ffffff'
  const surfaceMuted = mixHexColors('#ffffff', secondary, 0.18)
  const surfaceElevated = mixHexColors('#ffffff', secondary, 0.1)
  const surfaceHero = mixHexColors('#ffffff', secondary, 0.3)
  const surfaceCard = mixHexColors('#ffffff', secondary, 0.16)
  const surfaceCardHover = mixHexColors('#ffffff', accent, 0.08)
  const headerBg = mixHexColors('#ffffff', secondary, 0.22)
  const borderSoft = mixHexColors('#e5e7eb', accent, 0.18)
  const borderStrong = mixHexColors('#cbd5e1', accent, 0.36)
  const accentSoft = mixHexColors('#ffffff', accent, 0.16)
  const headerLink = contrastRatio(accent, headerBg) >= 3 ? accent : secondaryText
  const headerBrand = contrastRatio(primary, headerBg) >= 4.5 ? primary : secondaryText
  const heroOverlay = mixHexColors(primary, '#0f172a', 0.42)

  return {
    surfaceBase,
    surfaceMuted,
    surfaceElevated,
    surfaceHero,
    surfaceCard,
    surfaceCardHover,
    headerBg,
    headerLink,
    headerBrand,
    borderSoft,
    borderStrong,
    accentSoft,
    heroOverlay,
    headerShadow: `0 18px 40px ${mixHexColors(primary, '#ffffff', 0.75)}33`,
    buttonGlow: `0 18px 38px ${mixHexColors(primary, '#ffffff', 0.58)}44`,
  }
}

function buildDarkPalette(primary: string, secondary: string, accent: string): SurfacePalette {
  const surfaceBase = '#0a1324'
  const surfaceMuted = '#0f1c32'
  const surfaceElevated = '#111d33'
  const surfaceHero = '#12203a'
  const surfaceCard = '#111d33'
  const surfaceCardHover = '#172748'
  const headerBg = '#111d33'
  const borderSoft = mixHexColors('#334155', accent, 0.16)
  const borderStrong = mixHexColors('#475569', accent, 0.28)
  const accentSoft = mixHexColors(surfaceCard, accent, 0.22)
  const darkText = '#f8fbff'
  const mutedText = '#c5d2ea'
  const headerLink = contrastRatio(accent, headerBg) >= 3 ? accent : mutedText
  const headerBrand = contrastRatio(primary, headerBg) >= 4.5 ? primary : darkText
  const heroOverlay = '#020617'

  return {
    surfaceBase,
    surfaceMuted,
    surfaceElevated,
    surfaceHero,
    surfaceCard,
    surfaceCardHover,
    headerBg,
    headerLink,
    headerBrand,
    borderSoft,
    borderStrong,
    accentSoft,
    heroOverlay,
    headerShadow: `0 18px 48px ${mixHexColors('#020617', primary, 0.22)}88`,
    buttonGlow: `0 20px 42px ${mixHexColors(primary, '#020617', 0.48)}66`,
  }
}

export function buildThemeCssVars(input: ThemeColorInputs): CSSProperties {
  const { theme } = sanitizeThemeColorsForUi(input)
  const primary = theme.primaryColor
  const secondary = theme.secondaryColor
  const accent = theme.accentColor

  const primaryText = pickReadableTextColor(primary)
  const accentText = pickReadableTextColor(accent)
  const secondaryText = pickReadableTextColor(secondary)
  const lightPalette = buildLightPalette(primary, secondary, accent)
  const darkPalette = buildDarkPalette(primary, secondary, accent)

  return {
    '--color-primary': primary,
    '--color-secondary': secondary,
    '--color-accent': accent,
    '--color-primary-contrast': primaryText,
    '--color-accent-contrast': accentText,
    '--color-secondary-contrast': secondaryText,
    '--surface-base-light': lightPalette.surfaceBase,
    '--surface-base-dark': darkPalette.surfaceBase,
    '--surface-muted-light': lightPalette.surfaceMuted,
    '--surface-muted-dark': darkPalette.surfaceMuted,
    '--surface-elevated-light': lightPalette.surfaceElevated,
    '--surface-elevated-dark': darkPalette.surfaceElevated,
    '--surface-hero-light': lightPalette.surfaceHero,
    '--surface-hero-dark': darkPalette.surfaceHero,
    '--surface-card-light': lightPalette.surfaceCard,
    '--surface-card-dark': darkPalette.surfaceCard,
    '--surface-card-hover-light': lightPalette.surfaceCardHover,
    '--surface-card-hover-dark': darkPalette.surfaceCardHover,
    '--header-bg-light': lightPalette.headerBg,
    '--header-bg-dark': darkPalette.headerBg,
    '--header-link-light': lightPalette.headerLink,
    '--header-link-dark': darkPalette.headerLink,
    '--header-brand-light': lightPalette.headerBrand,
    '--header-brand-dark': darkPalette.headerBrand,
    '--border-soft-light': lightPalette.borderSoft,
    '--border-soft-dark': darkPalette.borderSoft,
    '--border-strong-light': lightPalette.borderStrong,
    '--border-strong-dark': darkPalette.borderStrong,
    '--accent-soft-light': lightPalette.accentSoft,
    '--accent-soft-dark': darkPalette.accentSoft,
    '--hero-overlay-light': lightPalette.heroOverlay,
    '--hero-overlay-dark': darkPalette.heroOverlay,
    '--header-shadow-light': lightPalette.headerShadow,
    '--header-shadow-dark': darkPalette.headerShadow,
    '--button-glow-light': lightPalette.buttonGlow,
    '--button-glow-dark': darkPalette.buttonGlow,
  } as CSSProperties
}

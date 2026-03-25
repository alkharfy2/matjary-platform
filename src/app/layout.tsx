import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Cairo, Readex_Pro } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { arSA } from '@clerk/localizations'
import { ThemeProvider } from '@/components/theme'
import { THEME_COOKIE_NAME, parseThemePreference } from '@/lib/theme'
import './globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
})

const readex = Readex_Pro({
  subsets: ['arabic', 'latin'],
  variable: '--font-readex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'متجري | أنشئ متجرك الإلكتروني باحتراف',
  description: 'منصة متجري لإطلاق وإدارة المتاجر الإلكترونية بسهولة وسرعة.',
}

const isPreviewMode =
  process.env.PREVIEW_MODE === 'true' && process.env.NODE_ENV !== 'production'

const clerkAppearance = {
  elements: {
    card: 'border-0 bg-transparent shadow-none',
    socialButtonsBlockButton:
      'border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] text-[var(--ds-text)] hover:bg-[var(--ds-hover)]',
    formFieldInput:
      'rounded-[16px] border border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)]',
    formButtonPrimary:
      'bg-[linear-gradient(135deg,var(--ds-primary),color-mix(in_oklab,var(--ds-primary)_70%,var(--ds-accent)))] text-[var(--ds-primary-contrast)] shadow-[var(--ds-glow-primary)] hover:brightness-105',
    footerActionText: 'text-[var(--ds-text-muted)]',
    footerActionLink: 'text-[var(--ds-primary)]',
    userButtonAvatarBox:
      'ring-1 ring-[var(--ds-divider)] shadow-[var(--ds-shadow-sm)]',
    userButtonPopoverCard:
      'border border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)]',
    userButtonPopoverActionButton:
      'text-[var(--ds-text)] hover:bg-[var(--ds-hover)]',
    userButtonPopoverActionButtonText: 'text-[var(--ds-text)]',
    userButtonPopoverActionButtonIcon: 'text-[var(--ds-text-muted)]',
    userButtonPopoverFooter:
      'border-t border-[var(--ds-divider)] bg-[var(--ds-surface-glass)]',
    userPreviewMainIdentifier: 'text-[var(--ds-text)]',
    userPreviewSecondaryIdentifier: 'text-[var(--ds-text-muted)]',
  },
} as const

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const themePreference = parseThemePreference(
    cookieStore.get(THEME_COOKIE_NAME)?.value
  )
  const forcedTheme = themePreference === 'system' ? undefined : themePreference

  const appContent = (
    <ThemeProvider initialPreference={themePreference}>{children}</ThemeProvider>
  )

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${readex.variable}`}
      data-theme={forcedTheme}
      data-theme-preference={themePreference}
      suppressHydrationWarning
    >
      <body className={`${cairo.className} antialiased`} suppressHydrationWarning>
        {isPreviewMode ? (
          appContent
        ) : (
          <ClerkProvider localization={arSA} appearance={clerkAppearance}>
            {appContent}
          </ClerkProvider>
        )}
      </body>
    </html>
  )
}

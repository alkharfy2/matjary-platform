'use client'

import { useState, type ReactNode } from 'react'
import { Menu, X, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/theme'
import { SuperAdminNav } from './super-admin-nav'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SuperAdminLayoutShellProps = {
  children: ReactNode
}

export function SuperAdminLayoutShell({ children }: SuperAdminLayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen app-shell-gradient lg:flex">
      <aside className="hidden w-72 shrink-0 border-e border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] backdrop-blur-xl lg:flex lg:flex-col">
        <div className="border-b border-[var(--ds-divider)] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[var(--ds-primary-soft)] p-2.5 text-[var(--ds-primary)] shadow-[var(--ds-glow-primary)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--ds-text)]">الإدارة العليا</h1>
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">Matjary Platform</p>
            </div>
          </div>
        </div>
        <SuperAdminNav className="p-2" />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-[var(--ds-overlay)] transition-opacity duration-[var(--ds-motion-fast)] lg:hidden',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-80 border-s border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)] transition-transform duration-[var(--ds-motion-base)] lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="border-b border-[var(--ds-divider)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-base font-semibold text-[var(--ds-text)]">الإدارة العليا</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ThemeToggle className="w-full justify-center" />
        </div>
        <SuperAdminNav className="p-2" onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                variant="secondary"
                size="icon"
                className="lg:hidden"
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ds-text-soft)]">Platform Admin</p>
                <h2 className="ds-heading text-lg font-semibold text-[var(--ds-text)] sm:text-xl">لوحة إدارة المنصة</h2>
              </div>
            </div>
            <ThemeToggle compact />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X, Store, Sparkles, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { ThemeToggle } from '@/components/theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PlatformHeaderProps = {
  hasStore: boolean
  dashboardHref: string
  storefrontHref: string
}

export function PlatformHeader({
  hasStore,
  dashboardHref,
  storefrontHref,
}: PlatformHeaderProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 18)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : originalOverflow

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileMenuOpen, mounted])

  const mobileMenu = (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[90] bg-[var(--ds-overlay)] backdrop-blur-sm transition-opacity duration-[var(--ds-motion-fast)] md:hidden',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-[100] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto border-s border-[var(--ds-divider)] bg-[color:color-mix(in_oklab,var(--ds-surface-elevated)_92%,white)] p-3 shadow-[var(--ds-shadow-lg)] backdrop-blur-2xl transition-transform duration-[var(--ds-motion-base)] md:hidden sm:p-4',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="min-h-full rounded-[28px] border border-[var(--ds-divider)] bg-[color:color-mix(in_oklab,var(--ds-surface)_94%,white)] p-4 shadow-[var(--ds-shadow-sm)] sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-2xl bg-[var(--ds-primary-soft)] p-2 text-[var(--ds-primary)]">
                <Store className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate ds-heading text-xl font-semibold text-[var(--ds-text)]">متجري</p>
                <p className="text-xs text-[var(--ds-text-muted)]">منصة بيع عربية حديثة</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-2xl border border-[var(--ds-divider)]"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-4">
            <ThemeToggle className="w-full justify-center" />
          </div>

          <nav className="flex flex-col gap-3">
            <Link href="/features">
              <Button
                variant="ghost"
                className="h-14 w-full justify-center rounded-[22px] border border-[var(--ds-divider)] bg-[var(--ds-surface)]/90 text-base"
              >
                المميزات
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="ghost"
                className="h-14 w-full justify-center rounded-[22px] border border-[var(--ds-divider)] bg-[var(--ds-surface)]/90 text-base"
              >
                الأسعار
              </Button>
            </Link>

            <SignedOut>
              <Link href="/auth/sign-in">
                <Button variant="secondary" className="h-14 w-full rounded-[22px] text-base">
                  تسجيل الدخول
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="h-14 w-full rounded-[22px] text-base" glow>
                  ابدأ مجانًا
                </Button>
              </Link>
            </SignedOut>

            <SignedIn>
              {hasStore ? (
                <Link href={storefrontHref}>
                  <Button variant="secondary" className="h-14 w-full rounded-[22px] text-base">
                    عرض متجرك
                  </Button>
                </Link>
              ) : null}
              <Link href={dashboardHref}>
                <Button className="h-14 w-full rounded-[22px] text-base" glow>
                  {hasStore ? 'لوحة التحكم' : 'إكمال إنشاء المتجر'}
                </Button>
              </Link>
            </SignedIn>
          </nav>
        </div>
      </aside>
    </>
  )

  return (
    <>
      <div
        className={cn(
          'mx-auto flex h-20 w-full max-w-[1380px] items-center justify-between px-4 transition-all duration-[var(--ds-motion-base)] sm:px-6',
          scrolled ? 'rounded-b-[28px]' : ''
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-bold text-[var(--ds-text)] sm:text-2xl"
        >
          <span className="rounded-2xl bg-[linear-gradient(135deg,var(--ds-primary),color-mix(in_oklab,var(--ds-primary)_65%,var(--ds-accent)))] p-2.5 text-[var(--ds-primary-contrast)] shadow-[var(--ds-glow-primary)]">
            <Store className="h-5 w-5" />
          </span>
          <span className="truncate ds-heading">متجري</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/features">
            <Button variant="ghost" size="sm">المميزات</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" size="sm">الأسعار</Button>
          </Link>
          <ThemeToggle compact />

          <SignedOut>
            <Link href="/auth/sign-in">
              <Button variant="secondary" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" glow className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                ابدأ مجانًا
              </Button>
            </Link>
          </SignedOut>

          <SignedIn>
            {hasStore ? (
              <Link href={storefrontHref}>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  عرض متجرك
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : null}
            <Link href={dashboardHref}>
              <Button size="sm" glow className="gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {hasStore ? 'لوحة التحكم' : 'إكمال إنشاء المتجر'}
              </Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle compact />
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mounted ? createPortal(mobileMenu, document.body) : null}
    </>
  )
}

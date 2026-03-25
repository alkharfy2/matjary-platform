import Link from 'next/link'
import type { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { merchants, stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  buildTenantDashboardHref,
  buildTenantStorefrontHref,
} from '@/lib/tenant/urls'
import { Button } from '@/components/ui/button'
import { PlatformHeader } from './platform-header'

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode
}) {
  const { userId } = await auth()
  let dashboardHref = '/onboarding'
  let storefrontHref = '/'
  let hasStore = false

  if (userId) {
    try {
      const result = await db
        .select({ slug: stores.slug })
        .from(stores)
        .innerJoin(merchants, eq(stores.merchantId, merchants.id))
        .where(eq(merchants.clerkUserId, userId))
        .limit(1)

      const slug = result[0]?.slug
      if (slug) {
        hasStore = true
        dashboardHref = buildTenantDashboardHref(slug)
        storefrontHref = buildTenantStorefrontHref(slug)
      }
    } catch (error) {
      console.error('Platform header dashboard link lookup failed:', error)
    }
  }

  return (
    <div className="min-h-screen app-shell-gradient">
      <header className="sticky top-0 z-50 border-b border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] backdrop-blur-xl">
        <PlatformHeader
          hasStore={hasStore}
          dashboardHref={dashboardHref}
          storefrontHref={storefrontHref}
        />
      </header>

      <main className="mx-auto w-full max-w-[1380px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">{children}</main>

      <footer className="border-t border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] py-10 backdrop-blur">
        <div className="mx-auto grid w-full max-w-[1380px] gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-[var(--ds-primary-soft)] p-2 text-[var(--ds-primary)]">
                ✦
              </span>
              <div>
                <p className="ds-heading text-lg font-semibold text-[var(--ds-text)]">متجري</p>
                <p className="text-sm text-[var(--ds-text-muted)]">منصة عربية لإطلاق وإدارة المتاجر الإلكترونية بشكل حديث وسريع.</p>
              </div>
            </div>
            <p className="text-sm text-[var(--ds-text-soft)]">© {new Date().getFullYear()} متجري. جميع الحقوق محفوظة.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Link href="/features">
              <Button variant="ghost" size="sm">المميزات</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm">الأسعار</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm" glow>ابدأ الآن</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}



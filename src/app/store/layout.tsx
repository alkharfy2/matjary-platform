import type { ReactNode } from 'react'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { StoreProvider } from '@/lib/tenant/store-context'
import { getStorefrontData } from '@/lib/queries/storefront'
import { buildThemeCssVars } from '@/lib/theme-color-utils'
import { notFound } from 'next/navigation'
import { StoreHeader } from './_components/store-header'
import { StoreFooter } from './_components/store-footer'
import { StorePaymentGate } from './_components/store-payment-gate'
import { TrackingScripts } from '@/components/tracking/tracking-scripts'
import { WhatsAppFloatingButton } from './_components/whatsapp-floating-button'
import { db } from '@/db'
import { platformPlans } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode
}) {
  const store = await getCurrentStore()

  if (!store) {
    notFound()
  }

  if (!store.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center app-shell-gradient" dir="rtl">
        <div className="card-surface max-w-md px-8 py-10 text-center">
          <h1 className="ds-heading text-2xl font-bold text-[var(--ds-text)]">المتجر غير متاح حاليًا</h1>
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">هذا المتجر متوقف مؤقتًا من قبل الإدارة.</p>
        </div>
      </div>
    )
  }

  if (!store.isPaid) {
    const plan = await db
      .select({ name: platformPlans.name, priceMonthly: platformPlans.priceMonthly })
      .from(platformPlans)
      .where(eq(platformPlans.id, store.plan))
      .limit(1)

    return (
      <StorePaymentGate
        storeId={store.id}
        storeName={store.name}
        storeSlug={store.slug}
        planName={plan[0]?.name ?? 'مدفوعة'}
        planPrice={plan[0]?.priceMonthly ?? '0'}
      />
    )
  }

  const storeData = await getStorefrontData(store.id)
  const categories = storeData?.categories ?? []
  const fullStore = storeData?.store
  const cssVars = buildThemeCssVars({
    primaryColor: store.theme.primaryColor || '#111827',
    secondaryColor: store.theme.secondaryColor || '#ffffff',
    accentColor: store.theme.accentColor || '#2563eb',
  })

  return (
    <StoreProvider
      store={{
        id: store.id,
        slug: store.slug,
        name: store.name,
        theme: store.theme,
        settings: store.settings,
        whatsappNumber: fullStore?.contactWhatsapp ?? null,
      }}
    >
      <TrackingScripts
        facebookPixelId={store.settings?.facebookPixelId}
        tiktokPixelId={store.settings?.tiktokPixelId}
        googleAnalyticsId={store.settings?.googleAnalyticsId}
      />
      <div
        className="store-theme-scope store-shell-gradient min-h-screen flex flex-col"
        dir="rtl"
        style={cssVars}
      >
        <StoreHeader
          storeSlug={store.slug}
          storeName={store.name}
          logoUrl={fullStore?.logoUrl ?? null}
          categories={categories}
          currency={store.settings.currency}
        />

        <main className="flex-1 pb-8">{children}</main>

        <StoreFooter
          storeSlug={store.slug}
          storeName={store.name}
          socialLinks={fullStore?.socialLinks ?? {}}
          contactPhone={fullStore?.contactPhone ?? null}
          contactEmail={fullStore?.contactEmail ?? null}
          pages={storeData?.pages ?? []}
        />
        <WhatsAppFloatingButton />
      </div>
    </StoreProvider>
  )
}


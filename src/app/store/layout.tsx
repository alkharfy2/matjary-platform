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
import { PwaInstallBanner } from './_components/pwa-install-banner'
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
        snapchatPixelId={store.settings?.snapchatPixelId}
      />
      {Boolean((store.settings as Record<string, unknown>)?.pwaEnabled) && (
        <>
          <link rel="manifest" href="/store/manifest.json" />
          <meta name="theme-color" content={store.theme.primaryColor || '#6366f1'} />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
            }}
          />
        </>
      )}
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
          blogEnabled={Boolean((store.settings as Record<string, unknown>)?.blogEnabled)}
          supportedLanguages={((store.settings as Record<string, unknown>)?.supportedLanguages as string[]) ?? ['ar']}
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
        <WhatsAppLink
          storeSlug={store.slug}
          storeName={store.name}
          whatsappEnabled={Boolean(store.settings?.whatsappFloatingEnabled)}
          whatsappNumber={fullStore?.contactWhatsapp ?? ''}
          whatsappMessage={
            (store.settings as Record<string, unknown>)?.whatsappDefaultMessage as string
            ?? `مرحباً، أنا أتواصل من متجر ${store.name}`
          }
          whatsappPosition={
            ((store.settings as Record<string, unknown>)?.whatsappFloatingPosition as string) ?? 'left'
          }
        />
        {Boolean((store.settings as Record<string, unknown>)?.pwaEnabled) && <PwaInstallBanner />}
      </div>
    </StoreProvider>
  )
}

/* ── Server-rendered helpers (avoid client component boundaries) ────── */

function WhatsAppLink({
  whatsappEnabled,
  whatsappNumber,
  whatsappMessage,
  whatsappPosition,
}: {
  storeSlug: string
  storeName: string
  whatsappEnabled: boolean
  whatsappNumber: string
  whatsappMessage: string
  whatsappPosition: string
}) {
  const posClass = whatsappPosition === 'left' ? 'start-4' : 'end-4'
  const cleanNumber = whatsappNumber.replace(/[^0-9+]/g, '')
  if (!whatsappEnabled || !cleanNumber) return null
  const waUrl = `https://wa.me/${encodeURIComponent(cleanNumber)}?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 ${posClass} z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110`}
      aria-label="تواصل عبر واتساب"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  )
}

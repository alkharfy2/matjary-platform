import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { notFound } from 'next/navigation'
import { LoyaltyClient } from './loyalty-client'

export default async function LoyaltyPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const settings = (store.settings ?? {}) as Record<string, unknown>
  if (!settings.loyaltyEnabled) notFound()

  const pointValue = (settings.loyaltyPointValue as number) || 0
  const minRedemption = (settings.loyaltyMinRedemption as number) || 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">نقاط الولاء</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--ds-text-muted)' }}>
        تابع رصيدك من نقاط الولاء واستخدمها في مشترياتك القادمة
      </p>
      <LoyaltyClient pointValue={pointValue} minRedemption={minRedemption} />
    </div>
  )
}

import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { notFound } from 'next/navigation'
import { AffiliateDashboardClient } from './dashboard-client'

export default async function AffiliateDashboardPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const settings = (store.settings ?? {}) as Record<string, unknown>
  if (!settings.affiliateEnabled) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">لوحة تحكم المسوق</h1>
      <AffiliateDashboardClient storeSlug={store.slug} />
    </div>
  )
}

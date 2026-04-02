import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { notFound } from 'next/navigation'
import { TrackOrder } from './_components/track-order'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}
  return {
    title: `تتبع الطلب | ${store.name}`,
    description: `تتبع حالة طلبك من ${store.name}`,
  }
}

export default async function TrackPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <TrackOrder currency={store.settings.currency} />
    </div>
  )
}

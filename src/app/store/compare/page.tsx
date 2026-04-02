import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { ComparePageContent } from './_components/compare-page-content'

export const metadata: Metadata = {
  title: 'مقارنة المنتجات',
}

export default async function ComparePage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  return <ComparePageContent storeId={store.id} storeSlug={store.slug} currency={store.settings.currency} />
}

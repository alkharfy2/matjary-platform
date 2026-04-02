import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { notFound } from 'next/navigation'
import { ReviewsClient } from './_components/reviews-client'

export default async function ReviewsPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  return <ReviewsClient storeId={store.id} />
}

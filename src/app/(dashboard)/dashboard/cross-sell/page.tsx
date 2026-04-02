import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import CrossSellClient from './_components/cross-sell-client'

export default async function CrossSellPage() {
  const store = await getCurrentStore()
  if (!store) return notFound()

  const productsResult = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      price: storeProducts.price,
      images: storeProducts.images,
    })
    .from(storeProducts)
    .where(eq(storeProducts.storeId, store.id))
    .orderBy(storeProducts.name)
    .limit(200)

  const serializedProducts = productsResult.map((p) => ({
    id: p.id,
    name: p.name,
    price: String(p.price),
    images: (p.images ?? []) as string[],
  }))

  return <CrossSellClient initialProducts={serializedProducts} />
}

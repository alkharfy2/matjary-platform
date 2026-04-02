import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { storeUpsellRules, storeProducts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import UpsellClient from './_components/upsell-client'

export default async function UpsellPage() {
  const store = await getCurrentStore()
  if (!store) return notFound()

  const [rules, productsResult] = await Promise.all([
    db
      .select({
        rule: storeUpsellRules,
        offerProduct: {
          id: storeProducts.id,
          name: storeProducts.name,
          price: storeProducts.price,
          images: storeProducts.images,
        },
      })
      .from(storeUpsellRules)
      .innerJoin(storeProducts, eq(storeUpsellRules.offerProductId, storeProducts.id))
      .where(eq(storeUpsellRules.storeId, store.id))
      .orderBy(storeUpsellRules.sortOrder),

    db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        price: storeProducts.price,
        images: storeProducts.images,
      })
      .from(storeProducts)
      .where(eq(storeProducts.storeId, store.id))
      .orderBy(storeProducts.name)
      .limit(200),
  ])

  // Serialize for client component
  const serializedRules = rules.map((r) => ({
    rule: {
      ...r.rule,
      discountValue: String(r.rule.discountValue),
      createdAt: r.rule.createdAt?.toISOString() ?? '',
      updatedAt: '',
    },
    offerProduct: {
      ...r.offerProduct,
      price: String(r.offerProduct.price),
      images: (r.offerProduct.images ?? []) as string[],
    },
  }))

  const serializedProducts = productsResult.map((p) => ({
    id: p.id,
    name: p.name,
    price: String(p.price),
    images: (p.images ?? []) as string[],
  }))

  return <UpsellClient initialRules={serializedRules} initialProducts={serializedProducts} />
}

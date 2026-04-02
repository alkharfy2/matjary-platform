import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeWishlists, storeProducts } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { z } from 'zod'

const syncSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().nullish(),
  })).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const body = await request.json()
    const { items } = syncSchema.parse(body)

    if (items.length === 0) return apiSuccess({ synced: 0 })

    const productIds = items.map(i => i.productId)
    const validProducts = await db.query.storeProducts.findMany({
      where: and(
        eq(storeProducts.storeId, storeId),
        inArray(storeProducts.id, productIds),
      ),
      columns: { id: true, price: true },
    })

    const validIds = new Set(validProducts.map(p => p.id))
    const priceMap = new Map(validProducts.map(p => [p.id, p.price]))

    const validItems = items.filter(i => validIds.has(i.productId))

    if (validItems.length > 0) {
      await db.insert(storeWishlists)
        .values(validItems.map(item => ({
          storeId,
          customerAccountId: account.id,
          productId: item.productId,
          variantId: item.variantId || '',
          priceWhenAdded: priceMap.get(item.productId) || null,
        })))
        .onConflictDoNothing()
    }

    return apiSuccess({ synced: validItems.length })
  } catch (error) {
    return handleApiError(error)
  }
}

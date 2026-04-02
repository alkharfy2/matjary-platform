import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeWishlists, storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'

export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const items = await db.query.storeWishlists.findMany({
      where: and(
        eq(storeWishlists.storeId, storeId),
        eq(storeWishlists.customerAccountId, account.id),
      ),
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: true,
            isActive: true,
            stock: true,
          },
        },
      },
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    })

    return apiSuccess({ items })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const { productId, variantId, price } = await request.json()
    if (!productId) return ApiErrors.validation('Product ID required')

    const product = await db.query.storeProducts.findFirst({
      where: and(
        eq(storeProducts.id, productId),
        eq(storeProducts.storeId, storeId),
      ),
    })
    if (!product) return ApiErrors.notFound('المنتج غير موجود')

    await db.insert(storeWishlists)
      .values({
        storeId,
        customerAccountId: account.id,
        productId,
        variantId: variantId || '',
        priceWhenAdded: price?.toString() || product.price,
      })
      .onConflictDoNothing()

    return apiSuccess({ message: 'تمت الإضافة للمفضلة' })
  } catch (error) {
    return handleApiError(error)
  }
}

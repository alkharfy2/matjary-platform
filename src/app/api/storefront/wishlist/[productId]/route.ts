import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeWishlists } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const { productId } = await params

    await db.delete(storeWishlists)
      .where(and(
        eq(storeWishlists.storeId, storeId),
        eq(storeWishlists.customerAccountId, account.id),
        eq(storeWishlists.productId, productId),
      ))

    return apiSuccess({ message: 'تمت الإزالة من المفضلة' })
  } catch (error) {
    return handleApiError(error)
  }
}

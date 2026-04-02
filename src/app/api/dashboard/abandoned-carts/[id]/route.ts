export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAbandonedCarts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/dashboard/abandoned-carts/[id] — تحديث حالة سلة متروكة
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const [existing] = await db
      .select({ id: storeAbandonedCarts.id })
      .from(storeAbandonedCarts)
      .where(and(
        eq(storeAbandonedCarts.id, id),
        eq(storeAbandonedCarts.storeId, store.id),
      ))
      .limit(1)

    if (!existing) return ApiErrors.notFound('السلة المتروكة')

    const body = await request.json()
    const { recoveryStatus } = body

    if (!recoveryStatus || !['pending', 'sent', 'recovered', 'expired'].includes(recoveryStatus)) {
      return ApiErrors.validation('حالة غير صالحة')
    }

    const updateData: Record<string, unknown> = { recoveryStatus }
    if (recoveryStatus === 'sent') {
      updateData.recoverySentAt = new Date()
    }

    const updated = await db
      .update(storeAbandonedCarts)
      .set(updateData)
      .where(eq(storeAbandonedCarts.id, id))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating abandoned cart:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/abandoned-carts/[id] — حذف سلة متروكة
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    await db
      .delete(storeAbandonedCarts)
      .where(and(
        eq(storeAbandonedCarts.id, id),
        eq(storeAbandonedCarts.storeId, store.id),
      ))

    return apiSuccess({ message: 'تم حذف السلة المتروكة بنجاح' })
  } catch (error) {
    console.error('Error deleting abandoned cart:', error)
    return handleApiError(error)
  }
}

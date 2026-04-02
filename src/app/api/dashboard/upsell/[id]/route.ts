export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeUpsellRules } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/dashboard/upsell/[id] — تحديث قاعدة upsell
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const [existing] = await db
      .select({ id: storeUpsellRules.id })
      .from(storeUpsellRules)
      .where(and(eq(storeUpsellRules.id, id), eq(storeUpsellRules.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('قاعدة الـ Upsell')

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (typeof body.discountType === 'string') updateData.discountType = body.discountType
    if (typeof body.discountValue === 'number') updateData.discountValue = body.discountValue.toFixed(2)
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive
    if (typeof body.sortOrder === 'number') updateData.sortOrder = body.sortOrder
    if (body.triggerProductId !== undefined) updateData.triggerProductId = body.triggerProductId

    const updated = await db
      .update(storeUpsellRules)
      .set(updateData)
      .where(eq(storeUpsellRules.id, id))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating upsell rule:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/upsell/[id] — حذف قاعدة upsell
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    await db
      .delete(storeUpsellRules)
      .where(and(eq(storeUpsellRules.id, id), eq(storeUpsellRules.storeId, store.id)))

    return apiSuccess({ message: 'تم حذف القاعدة بنجاح' })
  } catch (error) {
    console.error('Error deleting upsell rule:', error)
    return handleApiError(error)
  }
}

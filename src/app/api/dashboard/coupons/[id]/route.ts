import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCoupons } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateCouponSchema } from '@/lib/validations/order'

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/dashboard/coupons/[id] — تعديل كوبون
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeCoupons.id })
      .from(storeCoupons)
      .where(and(eq(storeCoupons.id, id), eq(storeCoupons.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الكوبون')

    const body = await request.json()
    const parsed = updateCouponSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.code !== undefined) {
      const codeExists = await db
        .select({ id: storeCoupons.id })
        .from(storeCoupons)
        .where(and(eq(storeCoupons.storeId, store.id), eq(storeCoupons.code, data.code)))
        .limit(1)

      if (codeExists[0] && codeExists[0].id !== id) {
        return ApiErrors.validation('هذا الكود مستخدم بالفعل')
      }

      updateData.code = data.code
    }
    if (data.type !== undefined) updateData.type = data.type
    if (data.value !== undefined) updateData.value = String(data.value)
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount ? String(data.minOrderAmount) : null
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount ? String(data.maxDiscount) : null
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validation('لا توجد بيانات للتحديث')
    }

    const updated = await db
      .update(storeCoupons)
      .set(updateData)
      .where(and(eq(storeCoupons.id, id), eq(storeCoupons.storeId, store.id)))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating coupon:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/coupons/[id] — حذف كوبون
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeCoupons.id })
      .from(storeCoupons)
      .where(and(eq(storeCoupons.id, id), eq(storeCoupons.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الكوبون')

    await db.delete(storeCoupons).where(and(eq(storeCoupons.id, id), eq(storeCoupons.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return handleApiError(error)
  }
}

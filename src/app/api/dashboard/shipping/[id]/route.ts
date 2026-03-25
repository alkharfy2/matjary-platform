import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeShippingZones } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateShippingZoneSchema } from '@/lib/validations/order'

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/dashboard/shipping/[id] — تعديل منطقة شحن
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeShippingZones.id })
      .from(storeShippingZones)
      .where(and(eq(storeShippingZones.id, id), eq(storeShippingZones.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('منطقة الشحن')

    const body = await request.json()
    const parsed = updateShippingZoneSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.governorates !== undefined) updateData.governorates = data.governorates
    if (data.shippingFee !== undefined) updateData.shippingFee = String(data.shippingFee)
    if (data.freeShippingMinimum !== undefined) {
      updateData.freeShippingMinimum =
        data.freeShippingMinimum === null ? null : String(data.freeShippingMinimum)
    }
    if (data.estimatedDays !== undefined) updateData.estimatedDays = data.estimatedDays
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validation('لا توجد بيانات للتحديث')
    }

    const updated = await db
      .update(storeShippingZones)
      .set(updateData)
      .where(and(eq(storeShippingZones.id, id), eq(storeShippingZones.storeId, store.id)))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating shipping zone:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/shipping/[id] — حذف منطقة شحن
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeShippingZones.id })
      .from(storeShippingZones)
      .where(and(eq(storeShippingZones.id, id), eq(storeShippingZones.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('منطقة الشحن')

    await db.delete(storeShippingZones).where(and(eq(storeShippingZones.id, id), eq(storeShippingZones.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting shipping zone:', error)
    return handleApiError(error)
  }
}

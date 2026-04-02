import 'server-only'
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError, apiError } from '@/lib/api/response'
import { z } from 'zod'

const bulkOrderSchema = z.object({
  action: z.enum(['update_status']),
  ids: z.array(z.string().uuid()).min(1, 'يجب تحديد طلب واحد على الأقل').max(100, 'الحد الأقصى 100 طلب'),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
})

/**
 * PATCH /api/dashboard/orders/bulk — تغيير حالة عدة طلبات
 */
export async function PATCH(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = bulkOrderSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { ids, status } = parsed.data

    // تحقق أن الطلبات تابعة للمتجر
    const existing = await db
      .select({ id: storeOrders.id })
      .from(storeOrders)
      .where(and(eq(storeOrders.storeId, store.id), inArray(storeOrders.id, ids)))

    const existingIds = existing.map(o => o.id)
    if (existingIds.length === 0) {
      return apiError('لم يتم العثور على طلبات مطابقة', 404)
    }

    await db
      .update(storeOrders)
      .set({ orderStatus: status, updatedAt: new Date() })
      .where(and(eq(storeOrders.storeId, store.id), inArray(storeOrders.id, existingIds)))

    return apiSuccess({ data: { updated: existingIds.length, failed: ids.length - existingIds.length } })
  } catch (error) {
    return handleApiError(error)
  }
}

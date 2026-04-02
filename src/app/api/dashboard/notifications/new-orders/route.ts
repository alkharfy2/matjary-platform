export const maxDuration = 30
/**
 * GET /api/dashboard/notifications/new-orders?since=ISO_TIMESTAMP
 * 
 * يرجع عدد الطلبات الجديدة بعد timestamp معين.
 * يُستدعى من مكون الـ polling في الداشبورد.
 */

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and, gt, count } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const url = new URL(request.url)
    const since = url.searchParams.get('since')

    if (!since) return apiError('معامل since مطلوب', 400)

    const sinceDate = new Date(since)
    if (isNaN(sinceDate.getTime())) return apiError('تاريخ غير صالح', 400)

    const [result] = await db
      .select({ count: count() })
      .from(storeOrders)
      .where(and(
        eq(storeOrders.storeId, store.id),
        gt(storeOrders.createdAt, sinceDate),
      ))

    return apiSuccess({
      newOrdersCount: result?.count ?? 0,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

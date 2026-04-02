export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeLoyaltyPoints } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/storefront/loyalty/history?phone=01xxxxxxxxx
 */
export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const phone = request.nextUrl.searchParams.get('phone')
    if (!phone) {
      return ApiErrors.validation('رقم الهاتف مطلوب')
    }

    const settings = store.settings as Record<string, unknown>
    if (!settings?.loyaltyEnabled) {
      return ApiErrors.validation('نظام الولاء غير مفعل')
    }

    const transactions = await db
      .select({
        id: storeLoyaltyPoints.id,
        points: storeLoyaltyPoints.points,
        type: storeLoyaltyPoints.type,
        notes: storeLoyaltyPoints.notes,
        createdAt: storeLoyaltyPoints.createdAt,
      })
      .from(storeLoyaltyPoints)
      .where(and(
        eq(storeLoyaltyPoints.storeId, store.id),
        eq(storeLoyaltyPoints.customerPhone, phone),
      ))
      .orderBy(desc(storeLoyaltyPoints.createdAt))
      .limit(50)

    return apiSuccess({ transactions })
  } catch (error) {
    return handleApiError(error)
  }
}

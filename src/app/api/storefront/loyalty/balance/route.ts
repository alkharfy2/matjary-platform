export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeLoyaltyPoints } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/storefront/loyalty/balance?phone=01xxxxxxxxx
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

    const [result] = await db
      .select({
        balance: sql<number>`COALESCE(SUM(points), 0)::int`,
      })
      .from(storeLoyaltyPoints)
      .where(and(
        eq(storeLoyaltyPoints.storeId, store.id),
        eq(storeLoyaltyPoints.customerPhone, phone),
      ))

    const balance = result?.balance ?? 0
    const loyaltyPointValue = (settings.loyaltyPointValue as number) || 0
    const loyaltyMinRedemption = (settings.loyaltyMinRedemption as number) || 0
    const valueInEgp = balance * loyaltyPointValue

    return apiSuccess({
      points: balance,
      valueInEgp,
      canRedeem: balance >= loyaltyMinRedemption,
      minRedemption: loyaltyMinRedemption,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

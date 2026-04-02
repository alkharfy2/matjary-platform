export const maxDuration = 30
import { db } from '@/db'
import { storeLoyaltyPoints } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/dashboard/loyalty — إحصائيات + أحدث العمليات
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const [transactions, statsResult] = await Promise.all([
      db
        .select()
        .from(storeLoyaltyPoints)
        .where(eq(storeLoyaltyPoints.storeId, store.id))
        .orderBy(desc(storeLoyaltyPoints.createdAt))
        .limit(50),

      db
        .select({
          totalEarned: sql<number>`COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0)::int`,
          totalRedeemed: sql<number>`COALESCE(SUM(CASE WHEN type = 'redeemed' THEN ABS(points) ELSE 0 END), 0)::int`,
          totalExpired: sql<number>`COALESCE(SUM(CASE WHEN type = 'expired' THEN ABS(points) ELSE 0 END), 0)::int`,
        })
        .from(storeLoyaltyPoints)
        .where(eq(storeLoyaltyPoints.storeId, store.id)),
    ])

    const stats = statsResult[0] ?? { totalEarned: 0, totalRedeemed: 0, totalExpired: 0 }

    return apiSuccess({
      transactions,
      stats: {
        ...stats,
        active: stats.totalEarned - stats.totalRedeemed - stats.totalExpired,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

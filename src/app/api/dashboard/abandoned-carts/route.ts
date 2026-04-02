export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAbandonedCarts } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/dashboard/abandoned-carts — قائمة السلات المتروكة مع إحصائيات
 * Query: ?status=pending&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(storeAbandonedCarts.storeId, store.id)]
    if (status && ['pending', 'sent', 'recovered', 'expired'].includes(status)) {
      conditions.push(eq(storeAbandonedCarts.recoveryStatus, status as 'pending' | 'sent' | 'recovered' | 'expired'))
    }

    // Fetch carts
    const carts = await db
      .select()
      .from(storeAbandonedCarts)
      .where(and(...conditions))
      .orderBy(desc(storeAbandonedCarts.createdAt))
      .limit(limit)
      .offset(offset)

    const totalResult = await db
      .select({ count: count() })
      .from(storeAbandonedCarts)
      .where(and(...conditions))

    const total = totalResult[0]?.count ?? 0

    // Stats
    const statsResult = await db
      .select({
        status: storeAbandonedCarts.recoveryStatus,
        count: count(),
      })
      .from(storeAbandonedCarts)
      .where(eq(storeAbandonedCarts.storeId, store.id))
      .groupBy(storeAbandonedCarts.recoveryStatus)

    const statsMap: Record<string, number> = {}
    for (const row of statsResult) {
      statsMap[row.status] = row.count
    }

    const totalAll = Object.values(statsMap).reduce((s, v) => s + v, 0)
    const recovered = statsMap['recovered'] ?? 0

    const stats = {
      total: totalAll,
      pending: statsMap['pending'] ?? 0,
      sent: statsMap['sent'] ?? 0,
      recovered,
      expired: statsMap['expired'] ?? 0,
      recoveryRate: totalAll > 0 ? Math.round((recovered / totalAll) * 1000) / 10 : 0,
    }

    return apiSuccess({
      carts,
      stats,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching abandoned carts:', error)
    return handleApiError(error)
  }
}

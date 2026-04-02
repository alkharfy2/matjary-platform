import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeReviews } from '@/db/schema'
import { eq, and, desc, sql, ilike } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/dashboard/reviews — قائمة التقييمات (تاجر)
 */
export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const params = request.nextUrl.searchParams
    const page = Math.max(1, Number(params.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, Number(params.get('limit') ?? '20')))
    const offset = (page - 1) * limit
    const status = params.get('status') // 'approved' | 'pending' | 'all'
    const search = params.get('search')

    const conditions = [eq(storeReviews.storeId, store.id)]

    if (status === 'approved') {
      conditions.push(eq(storeReviews.isApproved, true))
    } else if (status === 'pending') {
      conditions.push(eq(storeReviews.isApproved, false))
    }

    if (search) {
      conditions.push(ilike(storeReviews.customerName, `%${search}%`))
    }

    const whereClause = and(...conditions)

    const [reviews, countResult] = await Promise.all([
      db.query.storeReviews.findMany({
        where: whereClause,
        with: {
          product: { columns: { id: true, name: true, images: true, slug: true } },
        },
        orderBy: [desc(storeReviews.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(storeReviews)
        .where(whereClause),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    // Stats
    const statsResult = await db
      .select({
        totalReviews: sql<number>`COUNT(*)`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${storeReviews.isApproved} = false)`,
        avgRating: sql<number>`COALESCE(AVG(${storeReviews.rating}) FILTER (WHERE ${storeReviews.isApproved} = true), 0)`,
      })
      .from(storeReviews)
      .where(eq(storeReviews.storeId, store.id))

    const stats = statsResult[0]

    return apiSuccess({
      reviews,
      total,
      page,
      limit,
      stats: {
        totalReviews: Number(stats?.totalReviews ?? 0),
        pendingCount: Number(stats?.pendingCount ?? 0),
        avgRating: Math.round(Number(stats?.avgRating ?? 0) * 10) / 10,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

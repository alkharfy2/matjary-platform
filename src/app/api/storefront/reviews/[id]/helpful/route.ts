import { NextRequest } from 'next/server'
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { db } from '@/db'
import { storeReviews } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const { id } = await context.params

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`helpful:${ip}:${id}`, { maxRequests: 1, windowSeconds: 86400 })
    if (!allowed) return apiError('سبق لك التصويت على هذا التقييم', 429)

    const result = await db
      .update(storeReviews)
      .set({ helpfulCount: sql`${storeReviews.helpfulCount} + 1` })
      .where(
        and(
          eq(storeReviews.id, id),
          eq(storeReviews.storeId, store.id),
          eq(storeReviews.isApproved, true),
        )
      )
      .returning({ helpfulCount: storeReviews.helpfulCount })

    if (!result.length) return apiError('التقييم غير موجود', 404)

    return apiSuccess({ helpfulCount: result[0]!.helpfulCount })
  } catch (error) {
    return handleApiError(error)
  }
}

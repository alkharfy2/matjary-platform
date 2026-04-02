import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeReviews } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize-html'

type Params = { params: Promise<{ id: string }> }

const updateReviewSchema = z.object({
  isApproved: z.boolean().optional(),
  merchantReply: z.string().max(500).optional(),
})

/**
 * PATCH /api/dashboard/reviews/[id] — موافقة/رفض + رد التاجر
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const body = await request.json()
    const data = updateReviewSchema.parse(body)

    const existing = await db.query.storeReviews.findFirst({
      where: and(
        eq(storeReviews.id, id),
        eq(storeReviews.storeId, store.id),
      ),
    })

    if (!existing) return apiError('التقييم غير موجود', 404)

    const updates: Record<string, unknown> = {}

    if (data.isApproved !== undefined) {
      updates.isApproved = data.isApproved
    }

    if (data.merchantReply !== undefined) {
      updates.merchantReply = data.merchantReply ? sanitizeText(data.merchantReply) : null
      updates.merchantReplyAt = data.merchantReply ? new Date() : null
    }

    if (Object.keys(updates).length === 0) {
      return apiError('لا يوجد تحديثات', 400)
    }

    const [updated] = await db
      .update(storeReviews)
      .set(updates)
      .where(and(eq(storeReviews.id, id), eq(storeReviews.storeId, store.id)))
      .returning()

    return apiSuccess({ review: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/reviews/[id] — حذف تقييم
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const result = await db
      .delete(storeReviews)
      .where(and(eq(storeReviews.id, id), eq(storeReviews.storeId, store.id)))
      .returning({ id: storeReviews.id })

    if (!result.length) return apiError('التقييم غير موجود', 404)

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}

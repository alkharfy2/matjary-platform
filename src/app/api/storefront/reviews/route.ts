import { NextRequest } from 'next/server'
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { db } from '@/db'
import { storeReviews, storeOrders, storeOrderItems } from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'
import { sanitizeText } from '@/lib/sanitize-html'

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const productId = request.nextUrl.searchParams.get('productId')
    if (!productId) return apiError('productId مطلوب', 400)

    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '10')))
    const offset = (page - 1) * limit
    const ratingFilter = request.nextUrl.searchParams.get('rating')

    const reviews = await db.query.storeReviews.findMany({
      where: and(
        eq(storeReviews.storeId, store.id),
        eq(storeReviews.productId, productId),
        eq(storeReviews.isApproved, true),
        ...(ratingFilter ? [eq(storeReviews.rating, Number(ratingFilter))] : []),
      ),
      orderBy: [desc(storeReviews.createdAt)],
      limit,
      offset,
    })

    // Get summary
    const summaryResult = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${storeReviews.rating}), 0)`,
        totalCount: sql<number>`COUNT(*)`,
        verifiedCount: sql<number>`COUNT(*) FILTER (WHERE ${storeReviews.isVerifiedPurchase} = true)`,
      })
      .from(storeReviews)
      .where(
        and(
          eq(storeReviews.storeId, store.id),
          eq(storeReviews.productId, productId),
          eq(storeReviews.isApproved, true),
        )
      )

    // Rating distribution
    const distribution = await db
      .select({
        rating: storeReviews.rating,
        count: sql<number>`COUNT(*)`,
      })
      .from(storeReviews)
      .where(
        and(
          eq(storeReviews.storeId, store.id),
          eq(storeReviews.productId, productId),
          eq(storeReviews.isApproved, true),
        )
      )
      .groupBy(storeReviews.rating)

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const row of distribution) {
      ratingDistribution[row.rating] = Number(row.count)
    }

    const summary = summaryResult[0]

    return apiSuccess({
      reviews: reviews.map((r) => ({
        id: r.id,
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        isVerifiedPurchase: r.isVerifiedPurchase,
        merchantReply: r.merchantReply,
        merchantReplyAt: r.merchantReplyAt,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
      })),
      summary: {
        avgRating: Math.round(Number(summary?.avgRating ?? 0) * 10) / 10,
        totalCount: Number(summary?.totalCount ?? 0),
        verifiedCount: Number(summary?.verifiedCount ?? 0),
        ratingDistribution,
      },
      page,
      limit,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    if (store.settings.reviewsEnabled === false) {
      return apiError('التقييمات معطلة في هذا المتجر', 403)
    }

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`review:${ip}`, { maxRequests: 5, windowSeconds: 300 })
    if (!allowed) return apiError('حاول مرة أخرى بعد قليل', 429)

    const body = await request.json()
    const data = createReviewSchema.parse(body)

    // Check if customer has already reviewed this product
    const customer = await getCustomerAccount(store.id)
    let isVerifiedPurchase = false

    // Verify purchase if orderId is provided
    if (data.orderId) {
      const order = await db.query.storeOrders.findFirst({
        where: and(
          eq(storeOrders.id, data.orderId),
          eq(storeOrders.storeId, store.id),
        ),
      })

      if (order) {
        const orderItem = await db.query.storeOrderItems.findFirst({
          where: and(
            eq(storeOrderItems.orderId, data.orderId),
            eq(storeOrderItems.productId, data.productId),
          ),
        })
        if (orderItem && (order.orderStatus === 'delivered' || order.paymentStatus === 'paid')) {
          isVerifiedPurchase = true
        }
      }
    }

    const autoApprove = store.settings.reviewAutoApprove ?? false

    const [review] = await db.insert(storeReviews).values({
      storeId: store.id,
      productId: data.productId,
      orderId: data.orderId ?? null,
      customerAccountId: customer?.id ?? null,
      customerName: sanitizeText(data.customerName),
      customerPhone: data.customerPhone ?? null,
      rating: data.rating,
      comment: data.comment ? sanitizeText(data.comment) : null,
      isVerifiedPurchase,
      isApproved: autoApprove,
    }).returning()

    return apiSuccess({
      review: {
        id: review!.id,
        rating: review!.rating,
        isApproved: review!.isApproved,
        isVerifiedPurchase: review!.isVerifiedPurchase,
      },
      message: autoApprove ? 'تم نشر التقييم بنجاح' : 'تم إرسال التقييم وسيُنشر بعد المراجعة',
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

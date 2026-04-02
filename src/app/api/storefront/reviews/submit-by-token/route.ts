import { NextRequest } from 'next/server'
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response'
import { db } from '@/db'
import { storeReviewRequests, storeReviews, storeOrders, storeOrderItems, storeLoyaltyPoints, stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize-html'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const submitByTokenSchema = z.object({
  token: z.string().min(10).max(100),
  reviews: z.array(z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  })).min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`review-token:${ip}`, { maxRequests: 5, windowSeconds: 300 })
    if (!allowed) return apiError('حاول مرة أخرى بعد قليل', 429)

    const body = await request.json()
    const data = submitByTokenSchema.parse(body)

    // التحقق من التوكن
    const reviewRequest = await db.query.storeReviewRequests.findFirst({
      where: eq(storeReviewRequests.reviewToken, data.token),
    })

    if (!reviewRequest) return apiError('رابط التقييم غير صالح', 404)
    if (reviewRequest.status === 'completed') return apiError('تم تقييم هذا الطلب بالفعل', 400)
    if (reviewRequest.expiresAt && new Date() > reviewRequest.expiresAt) {
      return apiError('انتهت صلاحية رابط التقييم', 400)
    }

    // جلب الطلب
    const order = await db.query.storeOrders.findFirst({
      where: eq(storeOrders.id, reviewRequest.orderId),
    })

    if (!order) return apiError('الطلب غير موجود', 404)

    const storeData = await db.query.stores.findFirst({
      where: eq(stores.id, reviewRequest.storeId),
      columns: { settings: true },
    })

    const autoApprove = Boolean((storeData?.settings as Record<string, unknown>)?.reviewAutoApprove)

    // التحقق من أن المنتجات المُقيّمة تنتمي فعلاً للطلب
    const orderItems = await db.query.storeOrderItems.findMany({
      where: eq(storeOrderItems.orderId, order.id),
      columns: { productId: true },
    })
    const validProductIds = new Set(orderItems.map((i) => i.productId))
    const invalidProducts = data.reviews.filter((r) => !validProductIds.has(r.productId))
    if (invalidProducts.length > 0) {
      return apiError('بعض المنتجات لا تنتمي لهذا الطلب', 400)
    }

    // إنشاء المراجعات
    const createdReviews = []
    for (const review of data.reviews) {
      const [created] = await db.insert(storeReviews).values({
        storeId: reviewRequest.storeId,
        productId: review.productId,
        orderId: reviewRequest.orderId,
        customerName: sanitizeText(reviewRequest.customerName ?? order.customerName),
        customerPhone: reviewRequest.customerPhone ?? order.customerPhone,
        rating: review.rating,
        comment: review.comment ? sanitizeText(review.comment) : null,
        isVerifiedPurchase: true,
        isApproved: autoApprove,
      }).returning()
      createdReviews.push(created)
    }

    // تحديث حالة طلب التقييم
    await db.update(storeReviewRequests)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(storeReviewRequests.id, reviewRequest.id))

    // === إضافة نقاط ولاء (اختياري) ===
    const loyaltyPoints = Number((storeData?.settings as Record<string, unknown>)?.reviewLoyaltyPoints ?? 0)
    const loyaltyEnabled = Boolean((storeData?.settings as Record<string, unknown>)?.loyaltyEnabled)

    if (loyaltyEnabled && loyaltyPoints > 0 && reviewRequest.customerPhone) {
      db.insert(storeLoyaltyPoints).values({
        storeId: reviewRequest.storeId,
        customerPhone: reviewRequest.customerPhone,
        points: loyaltyPoints,
        type: 'earned',
        notes: `كسب ${loyaltyPoints} نقطة مقابل تقييم طلب #${order.orderNumber}`,
      }).catch(() => {})
    }

    return apiSuccess({
      count: createdReviews.length,
      message: autoApprove ? 'تم نشر تقييماتك بنجاح! شكراً لك ⭐' : 'تم إرسال تقييماتك وستُنشر بعد المراجعة. شكراً لك ⭐',
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

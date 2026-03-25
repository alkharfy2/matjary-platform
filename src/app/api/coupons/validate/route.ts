import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCoupons } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { validateCouponSchema } from '@/lib/validations/order'
import { rateLimit, getClientIp, RATE_LIMIT_COUPON_VALIDATE } from '@/lib/api/rate-limit'

/**
 * POST /api/coupons/validate — التحقق من صلاحية كوبون
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — 30 طلب / دقيقة لكل IP
    const ip = getClientIp(request)
    const rl = rateLimit(`coupon:validate:${ip}`, RATE_LIMIT_COUPON_VALIDATE)
    if (!rl.allowed) {
      return apiError('تم تجاوز الحد الأقصى للطلبات. حاول لاحقاً.', 429, 'RATE_LIMITED')
    }

    const body = await request.json()
    const parsed = validateCouponSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { storeId, code, subtotal } = parsed.data

    const coupon = await db
      .select()
      .from(storeCoupons)
      .where(
        and(
          eq(storeCoupons.storeId, storeId),
          eq(storeCoupons.code, code.toUpperCase()),
          eq(storeCoupons.isActive, true),
        )
      )
      .limit(1)

    if (!coupon[0]) {
      return apiSuccess({ valid: false, reason: 'الكوبون غير موجود' })
    }

    const c = coupon[0]
    const now = new Date()

    // Check usage limit
    if (c.usageLimit && c.usedCount >= c.usageLimit) {
      return apiSuccess({ valid: false, reason: 'تم استنفاد استخدامات هذا الكوبون' })
    }

    // Check dates
    if (c.startsAt && now < c.startsAt) {
      return apiSuccess({ valid: false, reason: 'الكوبون لم يبدأ بعد' })
    }
    if (c.expiresAt && now > c.expiresAt) {
      return apiSuccess({ valid: false, reason: 'الكوبون منتهي الصلاحية' })
    }

    // Check min order
    if (c.minOrderAmount && subtotal < parseFloat(c.minOrderAmount)) {
      return apiSuccess({
        valid: false,
        reason: `الحد الأدنى لاستخدام الكوبون هو ${c.minOrderAmount}`,
      })
    }

    // Calculate discount
    let discountAmount = 0
    if (c.type === 'percentage') {
      discountAmount = subtotal * (parseFloat(c.value) / 100)
      if (c.maxDiscount) {
        discountAmount = Math.min(discountAmount, parseFloat(c.maxDiscount))
      }
    } else {
      discountAmount = parseFloat(c.value)
    }
    discountAmount = Math.min(discountAmount, subtotal)

    return apiSuccess({
      valid: true,
      type: c.type,
      value: parseFloat(c.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return handleApiError(error)
  }
}


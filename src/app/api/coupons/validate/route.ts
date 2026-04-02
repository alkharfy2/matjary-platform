export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCoupons, storeOrders } from '@/db/schema'
import { eq, and, ne, sql } from 'drizzle-orm'
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

    const { storeId, code, subtotal, customerPhone, cartProductIds, cartCategoryIds } = parsed.data

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

    // P3: First order only check
    if (c.firstOrderOnly && customerPhone) {
      const existingOrders = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(storeOrders)
        .where(and(
          eq(storeOrders.storeId, storeId),
          eq(storeOrders.customerPhone, customerPhone),
          ne(storeOrders.orderStatus, 'cancelled'),
        ))

      if ((existingOrders[0]?.count ?? 0) > 0) {
        return apiSuccess({ valid: false, reason: 'هذا الكوبون متاح لأول طلب فقط' })
      }
    }

    // P3: Per-customer usage limit
    if (c.usagePerCustomer && customerPhone) {
      const customerUsage = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(storeOrders)
        .where(and(
          eq(storeOrders.storeId, storeId),
          eq(storeOrders.customerPhone, customerPhone),
          eq(storeOrders.couponCode, c.code),
        ))

      if ((customerUsage[0]?.count ?? 0) >= c.usagePerCustomer) {
        return apiSuccess({ valid: false, reason: 'تم استخدام هذا الكوبون بالحد الأقصى المسموح لك' })
      }
    }

    // P3: Applicable products check
    const applicableProductIds = c.applicableProductIds ?? []
    const effectiveSubtotal = subtotal
    if (applicableProductIds.length > 0 && cartProductIds && cartProductIds.length > 0) {
      const hasApplicable = cartProductIds.some(id => applicableProductIds.includes(id))
      if (!hasApplicable) {
        return apiSuccess({ valid: false, reason: 'هذا الكوبون لا ينطبق على المنتجات في السلة' })
      }
    }

    // P3: Applicable categories check
    const applicableCategoryIds = c.applicableCategoryIds ?? []
    if (applicableCategoryIds.length > 0 && cartCategoryIds && cartCategoryIds.length > 0) {
      const hasApplicable = cartCategoryIds.some(id => applicableCategoryIds.includes(id))
      if (!hasApplicable) {
        return apiSuccess({ valid: false, reason: 'هذا الكوبون لا ينطبق على تصنيفات المنتجات في السلة' })
      }
    }

    // P3: Free shipping coupon
    if (c.isFreeShipping) {
      return apiSuccess({
        valid: true,
        type: 'free_shipping',
        isFreeShipping: true,
        discountAmount: 0,
        code: c.code,
      })
    }

    // Calculate discount
    let discountAmount = 0
    if (c.type === 'percentage') {
      discountAmount = effectiveSubtotal * (parseFloat(c.value) / 100)
      if (c.maxDiscount) {
        discountAmount = Math.min(discountAmount, parseFloat(c.maxDiscount))
      }
    } else {
      discountAmount = parseFloat(c.value)
    }
    discountAmount = Math.min(discountAmount, effectiveSubtotal)

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


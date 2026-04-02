export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores, platformPlans } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { createSubscriptionSchema } from '@/lib/validations/subscription'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'
import { createSubscriptionSession } from '@/lib/payments/kashier'

/** إنشاء اشتراك — 10 طلبات / ساعة */
const RATE_LIMIT_SUB_CREATE = {
  maxRequests: 10,
  windowSeconds: 3600,
}

/**
 * POST /api/payments/subscription/create
 * إنشاء جلسة Kashier لدفع اشتراك الخطة
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = getClientIp(request)
    const rl = rateLimit(`sub:create:${ip}`, RATE_LIMIT_SUB_CREATE)
    if (!rl.allowed) {
      return apiError('تم تجاوز الحد الأقصى للطلبات. حاول لاحقاً.', 429, 'RATE_LIMITED')
    }

    // 2. Zod validation
    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    // 3. Auth — باستخدام getAuthenticatedMerchant()
    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    // 4. جلب المتجر + تحقق ملكية
    const storeRow = await db
      .select()
      .from(stores)
      .where(eq(stores.id, parsed.data.storeId))
      .limit(1)

    if (!storeRow[0]) return ApiErrors.storeNotFound()

    if (storeRow[0].merchantId !== merchant.id) {
      return apiError('ليس لديك صلاحية على هذا المتجر', 403, 'FORBIDDEN')
    }

    // 5. تأكد مش مدفوع بالفعل
    if (storeRow[0].isPaid) {
      return apiError('المتجر مُفعّل بالفعل', 409, 'ALREADY_PAID')
    }

    // 6. جلب سعر الخطة من platform_plans
    const planRow = await db
      .select({ priceMonthly: platformPlans.priceMonthly })
      .from(platformPlans)
      .where(eq(platformPlans.id, storeRow[0].plan))
      .limit(1)

    if (!planRow[0]) {
      return apiError('الخطة غير موجودة', 404, 'PLAN_NOT_FOUND')
    }

    const amount = planRow[0].priceMonthly
    if (parseFloat(amount) === 0) {
      // خطة مجانية — نفعّل مباشرة بدون دفع
      await db
        .update(stores)
        .set({ isPaid: true, updatedAt: new Date() })
        .where(eq(stores.id, parsed.data.storeId))

      return apiSuccess({ paymentUrl: null, activated: true }, 200)
    }

    // 7. تخزين المبلغ المتوقع على المتجر
    await db
      .update(stores)
      .set({ subscriptionAmount: amount, updatedAt: new Date() })
      .where(eq(stores.id, parsed.data.storeId))

    // 8. إنشاء جلسة Kashier
    const { redirectUrl } = await createSubscriptionSession({
      storeId: parsed.data.storeId,
      storeSlug: storeRow[0].slug,
      amount,
      currency: 'EGP',
      merchantEmail: merchant.email,
    })

    // 9. إرجاع رابط الدفع
    return apiSuccess({ paymentUrl: redirectUrl }, 200)
  } catch (error) {
    console.error('POST /api/payments/subscription/create error:', error)
    return handleApiError(error)
  }
}

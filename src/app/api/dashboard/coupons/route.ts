export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCoupons } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { createCouponSchema } from '@/lib/validations/order'

/**
 * GET /api/dashboard/coupons — قائمة الكوبونات
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const coupons = await db
      .select()
      .from(storeCoupons)
      .where(eq(storeCoupons.storeId, store.id))
      .orderBy(desc(storeCoupons.createdAt))

    return apiSuccess(coupons)
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/coupons — إنشاء كوبون
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = createCouponSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    // Check code uniqueness within store
    const codeExists = await db
      .select({ id: storeCoupons.id })
      .from(storeCoupons)
      .where(and(eq(storeCoupons.storeId, store.id), eq(storeCoupons.code, data.code)))
      .limit(1)

    if (codeExists[0]) {
      return ApiErrors.validation('هذا الكود مستخدم بالفعل')
    }

    const newCoupon = await db
      .insert(storeCoupons)
      .values({
        storeId: store.id,
        code: data.code,
        type: data.type,
        value: String(data.value),
        minOrderAmount: data.minOrderAmount ? String(data.minOrderAmount) : null,
        maxDiscount: data.maxDiscount ? String(data.maxDiscount) : null,
        usageLimit: data.usageLimit,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
        isActive: data.isActive,
        firstOrderOnly: data.firstOrderOnly ?? false,
        applicableProductIds: data.applicableProductIds ?? [],
        applicableCategoryIds: data.applicableCategoryIds ?? [],
        isFreeShipping: data.isFreeShipping ?? false,
        autoApply: data.autoApply ?? false,
        usagePerCustomer: data.usagePerCustomer,
      })
      .returning()

    return apiSuccess(newCoupon[0], 201)
  } catch (error) {
    console.error('Error creating coupon:', error)
    return handleApiError(error)
  }
}

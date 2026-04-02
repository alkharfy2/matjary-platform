export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeUpsellRules, storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const upsellRuleSchema = z.object({
  triggerProductId: z.string().uuid().nullable().optional(),
  offerProductId: z.string().uuid({ error: 'منتج العرض مطلوب' }),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0, { error: 'قيمة الخصم يجب أن تكون 0 أو أكثر' }),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

/**
 * GET /api/dashboard/upsell — قائمة قواعد الـ Upsell
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const rules = await db
      .select({
        rule: storeUpsellRules,
        offerProduct: {
          id: storeProducts.id,
          name: storeProducts.name,
          price: storeProducts.price,
          images: storeProducts.images,
        },
      })
      .from(storeUpsellRules)
      .innerJoin(storeProducts, eq(storeUpsellRules.offerProductId, storeProducts.id))
      .where(eq(storeUpsellRules.storeId, store.id))
      .orderBy(storeUpsellRules.sortOrder)

    return apiSuccess(rules)
  } catch (error) {
    console.error('Error fetching upsell rules:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/upsell — إنشاء قاعدة upsell جديدة
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = upsellRuleSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { offerProductId, triggerProductId, discountType, discountValue, isActive, sortOrder } = parsed.data

    // Verify offer product belongs to store
    const [product] = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, offerProductId), eq(storeProducts.storeId, store.id)))
      .limit(1)

    if (!product) return ApiErrors.validation('منتج العرض غير موجود في متجرك')

    const rule = await db
      .insert(storeUpsellRules)
      .values({
        storeId: store.id,
        triggerProductId: triggerProductId ?? null,
        offerProductId,
        discountType,
        discountValue: discountValue.toFixed(2),
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      })
      .returning()

    return apiSuccess(rule[0], 201)
  } catch (error) {
    console.error('Error creating upsell rule:', error)
    return handleApiError(error)
  }
}

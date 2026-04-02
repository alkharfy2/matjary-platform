export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { platformPlans } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { isSuperAdmin } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { createPlanSchema } from '@/lib/validations/order'

/**
 * GET /api/admin/plans — قائمة الخطط
 */
export async function GET() {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const plans = await db
      .select()
      .from(platformPlans)
      .orderBy(asc(platformPlans.sortOrder))

    return apiSuccess(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/plans — إنشاء خطة جديدة
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const body = await request.json()
    const parsed = createPlanSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    const newPlan = await db.transaction(async (tx) => {
      if (data.isMostPopular) {
        await tx.update(platformPlans).set({ isMostPopular: false })
      }

      const inserted = await tx
        .insert(platformPlans)
        .values({
          id: data.id,
          name: data.name,
          nameEn: data.nameEn,
          priceMonthly: String(data.priceMonthly),
          priceYearly: data.priceYearly ? String(data.priceYearly) : null,
          orderFee: data.orderFee ? String(data.orderFee) : null,
          maxProducts: data.maxProducts,
          maxOrdersPerMonth: data.maxOrdersPerMonth,
          features: data.features,
          isMostPopular: data.isMostPopular,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        })
        .returning()

      return inserted[0]
    })

    return apiSuccess(newPlan, 201)
  } catch (error) {
    console.error('Error creating plan:', error)
    return handleApiError(error)
  }
}

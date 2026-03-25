import { NextRequest } from 'next/server'
import { db } from '@/db'
import { platformPlans } from '@/db/schema'
import { eq, ne } from 'drizzle-orm'
import { isSuperAdmin } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updatePlanSchema } from '@/lib/validations/order'

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/admin/plans/[id] — تعديل خطة
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const { id } = await params
    const body = await request.json()
    const parsed = updatePlanSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    const existingPlan = await db
      .select({ id: platformPlans.id })
      .from(platformPlans)
      .where(eq(platformPlans.id, id))
      .limit(1)

    if (!existingPlan[0]) return ApiErrors.notFound('الخطة')

    if (data.name !== undefined) updateData.name = data.name
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn
    if (data.priceMonthly !== undefined) updateData.priceMonthly = String(data.priceMonthly)
    if (data.priceYearly !== undefined) updateData.priceYearly = data.priceYearly ? String(data.priceYearly) : null
    if (data.orderFee !== undefined) updateData.orderFee = data.orderFee ? String(data.orderFee) : null
    if (data.maxProducts !== undefined) updateData.maxProducts = data.maxProducts
    if (data.maxOrdersPerMonth !== undefined) updateData.maxOrdersPerMonth = data.maxOrdersPerMonth
    if (data.features !== undefined) updateData.features = data.features
    if (data.isMostPopular !== undefined) updateData.isMostPopular = data.isMostPopular
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const updated = await db.transaction(async (tx) => {
      if (data.isMostPopular === true) {
        await tx
          .update(platformPlans)
          .set({ isMostPopular: false })
          .where(ne(platformPlans.id, id))
      }

      const rows = await tx
        .update(platformPlans)
        .set(updateData)
        .where(eq(platformPlans.id, id))
        .returning()

      return rows[0]
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating plan:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/admin/plans/[id] — حذف خطة
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const { id } = await params

    const deleted = await db
      .delete(platformPlans)
      .where(eq(platformPlans.id, id))
      .returning({ id: platformPlans.id })

    if (!deleted[0]) {
      return ApiErrors.notFound('الخطة')
    }

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return handleApiError(error)
  }
}

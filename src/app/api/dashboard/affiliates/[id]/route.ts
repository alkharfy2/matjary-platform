export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAffiliates, storeAffiliateSales } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, and, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

const updateAffiliateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10).max(15).optional(),
  commissionRate: z.coerce.number().min(0.01).max(50).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/dashboard/affiliates/[id] — تفاصيل المسوق
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id } = await params

    const [affiliate] = await db
      .select()
      .from(storeAffiliates)
      .where(and(eq(storeAffiliates.id, id), eq(storeAffiliates.storeId, store.id)))
      .limit(1)

    if (!affiliate) return ApiErrors.notFound('المسوق')

    return apiSuccess(affiliate)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/affiliates/[id] — تعديل المسوق
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id } = await params

    const body = await request.json()
    const data = updateAffiliateSchema.parse(body)

    const [existing] = await db
      .select({ id: storeAffiliates.id })
      .from(storeAffiliates)
      .where(and(eq(storeAffiliates.id, id), eq(storeAffiliates.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('المسوق')

    const setData: Record<string, unknown> = { ...data }
    if (data.commissionRate !== undefined) {
      setData.commissionRate = String(data.commissionRate)
    }

    const [updated] = await db
      .update(storeAffiliates)
      .set(setData)
      .where(eq(storeAffiliates.id, id))
      .returning()

    return apiSuccess(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/affiliates/[id] — حذف المسوق
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id } = await params

    const [existing] = await db
      .select({ id: storeAffiliates.id })
      .from(storeAffiliates)
      .where(and(eq(storeAffiliates.id, id), eq(storeAffiliates.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('المسوق')

    await db.delete(storeAffiliates).where(eq(storeAffiliates.id, id))

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/dashboard/affiliates/[id] — تحديث حالة مبيعة (اعتماد/دفع/رفض)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id: affiliateId } = await params

    const body = await request.json()
    const { saleId, action } = body as { saleId: string; action: 'approve' | 'pay' | 'cancel' }

    if (!saleId || !action) return ApiErrors.validation('saleId و action مطلوبين')

    const [sale] = await db
      .select()
      .from(storeAffiliateSales)
      .where(and(
        eq(storeAffiliateSales.id, saleId),
        eq(storeAffiliateSales.affiliateId, affiliateId),
        eq(storeAffiliateSales.storeId, store.id),
      ))
      .limit(1)

    if (!sale) return ApiErrors.notFound('البيعة')

    const statusMap: Record<string, string> = {
      approve: 'approved',
      pay: 'paid',
      cancel: 'cancelled',
    }

    const newStatus = statusMap[action]
    if (!newStatus) return ApiErrors.validation('إجراء غير صالح')

    await db
      .update(storeAffiliateSales)
      .set({ status: newStatus as 'pending' | 'approved' | 'paid' | 'cancelled' })
      .where(eq(storeAffiliateSales.id, saleId))

    // When paying, deduct from pending commission
    if (action === 'pay') {
      await db
        .update(storeAffiliates)
        .set({
          pendingCommission: sql`GREATEST(0, ${storeAffiliates.pendingCommission} - ${sale.commissionAmount})`,
        })
        .where(eq(storeAffiliates.id, affiliateId))
    }

    // When cancelling, reverse totals
    if (action === 'cancel' && sale.status === 'pending') {
      await db
        .update(storeAffiliates)
        .set({
          totalSales: sql`GREATEST(0, ${storeAffiliates.totalSales} - ${sale.saleAmount})`,
          totalCommission: sql`GREATEST(0, ${storeAffiliates.totalCommission} - ${sale.commissionAmount})`,
          pendingCommission: sql`GREATEST(0, ${storeAffiliates.pendingCommission} - ${sale.commissionAmount})`,
        })
        .where(eq(storeAffiliates.id, affiliateId))
    }

    return apiSuccess({ status: newStatus })
  } catch (error) {
    return handleApiError(error)
  }
}

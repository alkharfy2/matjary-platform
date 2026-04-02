export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeSupplierProducts } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  supplierName: z.string().min(1).max(200).optional(),
  supplierProductUrl: z.string().url().optional().nullable(),
  supplierPrice: z.coerce.number().min(0).optional(),
  retailPrice: z.coerce.number().min(0).optional(),
  autoOrder: z.boolean().optional(),
  leadTimeDays: z.coerce.number().int().min(1).max(365).optional(),
  notes: z.string().max(500).optional().nullable(),
})

/**
 * PUT /api/dashboard/dropshipping/[id] — تعديل ربط
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
    const data = updateSchema.parse(body)

    const [existing] = await db
      .select({ id: storeSupplierProducts.id })
      .from(storeSupplierProducts)
      .where(and(eq(storeSupplierProducts.id, id), eq(storeSupplierProducts.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('الربط')

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() }
    if (data.supplierPrice !== undefined) updateData.supplierPrice = String(data.supplierPrice)
    if (data.retailPrice !== undefined) updateData.retailPrice = String(data.retailPrice)

    const [updated] = await db
      .update(storeSupplierProducts)
      .set(updateData)
      .where(eq(storeSupplierProducts.id, id))
      .returning()

    return apiSuccess(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/dropshipping/[id] — حذف ربط
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
      .select({ id: storeSupplierProducts.id })
      .from(storeSupplierProducts)
      .where(and(eq(storeSupplierProducts.id, id), eq(storeSupplierProducts.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('الربط')

    await db.delete(storeSupplierProducts).where(eq(storeSupplierProducts.id, id))

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
